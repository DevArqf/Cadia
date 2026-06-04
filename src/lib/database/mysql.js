const mysql = require('mysql2/promise');

const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL;

const pool = connectionString
	? mysql.createPool({
			uri: connectionString,
			waitForConnections: true,
			connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10
		})
	: null;

let connected = false;
let lastError = null;

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
	return runWithRetry(() => getPool().execute(sql, params));
}

async function query(sql, params = []) {
	return runWithRetry(() => getPool().query(sql, params));
}

async function runWithRetry(operation) {
	try {
		return await operation();
	} catch (error) {
		if (!isTransientConnectionError(error)) throw error;

		lastError = error;
		await delay(250);
		return operation();
	}
}

function isTransientConnectionError(error) {
	return ['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EPIPE'].includes(error?.code);
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
	execute,
	getMysqlError,
	getPool,
	isMysqlConnected,
	query
};
