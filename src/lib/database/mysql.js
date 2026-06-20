const { AsyncLocalStorage } = require('node:async_hooks');
const mysql = require('mysql2/promise');

const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL;

const pool = connectionString
	? mysql.createPool({
			uri: connectionString,
			waitForConnections: true,
			connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
			connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT) || 15_000
		})
	: null;

let connected = false;
let lastError = null;
let reconnecting = null;
const transactionStorage = new AsyncLocalStorage();

async function connectMysql() {
	if (!pool) {
		connected = false;
		lastError = new Error('DATABASE_URL or MYSQL_URL is not set');
		return { error: true, message: lastError.message };
	}

	try {
		await pool.query(`
			CREATE TABLE IF NOT EXISTS cadia_documents (
				id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
				model VARCHAR(191) NOT NULL,
				data JSON NOT NULL,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX cadia_documents_model_idx (model)
			)
		`);
		connected = true;
		lastError = null;
		return { error: false, message: 'Database Connected' };
	} catch (error) {
		connected = false;
		lastError = error;
		return { error: true, message: error.message };
	}
}

async function execute(sql, params = []) {
	const transaction = transactionStorage.getStore();
	if (transaction) return transaction.connection.execute(sql, params);
	return runWithRetry(() => getPool().execute(sql, params));
}

async function query(sql, params = []) {
	const transaction = transactionStorage.getStore();
	if (transaction) return transaction.connection.query(sql, params);
	return runWithRetry(() => getPool().query(sql, params));
}

async function withTransaction(operation) {
	if (transactionStorage.getStore()) return operation();
	if (!connected) await reconnect();

	const connection = await getPool().getConnection();
	const transaction = { connection, locks: new Set() };
	try {
		await connection.beginTransaction();
		const result = await transactionStorage.run(transaction, operation);
		await connection.commit();
		return result;
	} catch (error) {
		await connection.rollback().catch(() => null);
		throw error;
	} finally {
		for (const lockName of [...transaction.locks].reverse()) {
			await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => null);
		}
		connection.release();
	}
}

async function acquireTransactionLock(name, timeoutSeconds = 5) {
	const transaction = transactionStorage.getStore();
	if (!transaction) throw new Error('Transaction locks require an active transaction.');
	const lockName = String(name);
	if (transaction.locks.has(lockName)) return;

	const [rows] = await transaction.connection.query('SELECT GET_LOCK(?, ?) AS acquired', [lockName, timeoutSeconds]);
	if (Number(rows[0]?.acquired) !== 1) throw new Error(`Could not acquire transaction lock: ${name}`);
	transaction.locks.add(lockName);
}

function isInTransaction() {
	return Boolean(transactionStorage.getStore());
}

async function runWithRetry(operation) {
	const attempts = Math.max(Number(process.env.MYSQL_RETRY_ATTEMPTS) || 3, 1);

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			if (!connected) await reconnect();
			const result = await operation();
			connected = true;
			lastError = null;
			return result;
		} catch (error) {
			lastError = error;
			if (!isTransientConnectionError(error) || attempt === attempts) {
				if (isTransientConnectionError(error)) connected = false;
				throw error;
			}

			connected = false;
			await delay(Math.min(250 * 2 ** (attempt - 1), 2_000));
		}
	}
}

async function reconnect() {
	if (!pool) throw new Error('DATABASE_URL or MYSQL_URL is not set');
	if (!reconnecting) {
		reconnecting = connectMysql().finally(() => {
			reconnecting = null;
		});
	}

	const result = await reconnecting;
	if (result.error) throw lastError || new Error(result.message);
	return result;
}

function isTransientConnectionError(error) {
	return ['EAI_AGAIN', 'ECONNRESET', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EPIPE'].includes(error?.code);
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMysqlConnected() {
	return connected;
}

function getMysqlError() {
	return lastError;
}

function getPool() {
	if (!pool) throw new Error('DATABASE_URL or MYSQL_URL is not set');
	return pool;
}

module.exports = {
	connectMysql,
	acquireTransactionLock,
	execute,
	getMysqlError,
	getPool,
	isMysqlConnected,
	isInTransaction,
	query,
	withTransaction
};
