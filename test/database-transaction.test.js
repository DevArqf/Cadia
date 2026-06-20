const assert = require('node:assert/strict');
const test = require('node:test');

test('transactions commit successful work and route queries through one connection', async () => {
	const events = [];
	const loaded = loadMysql(transactionConnection(events));

	try {
		const result = await loaded.mysql.withTransaction(async () => {
			await loaded.mysql.execute('UPDATE records SET value = ?', [1]);
			await loaded.mysql.acquireTransactionLock('rpg:user');
			return 'done';
		});

		assert.equal(result, 'done');
		assert.deepEqual(events, ['pool-query', 'get-connection', 'begin', 'execute', 'lock:rpg:user', 'commit', 'unlock:rpg:user', 'release']);
	} finally {
		loaded.restore();
	}
});

test('transactions roll back failed work', async () => {
	const events = [];
	const loaded = loadMysql(transactionConnection(events));

	try {
		await assert.rejects(
			() =>
				loaded.mysql.withTransaction(async () => {
					await loaded.mysql.acquireTransactionLock('rpg:failed');
					throw new Error('failed');
				}),
			/failed/
		);
		assert.deepEqual(events, ['pool-query', 'get-connection', 'begin', 'lock:rpg:failed', 'rollback', 'unlock:rpg:failed', 'release']);
	} finally {
		loaded.restore();
	}
});

function transactionConnection(events) {
	return {
		events,
		beginTransaction: async () => events.push('begin'),
		execute: async () => {
			events.push('execute');
			return [{ affectedRows: 1 }];
		},
		query: async (sql, params) => {
			events.push(`${sql.includes('RELEASE_LOCK') ? 'unlock' : 'lock'}:${params[0]}`);
			return [[{ acquired: 1 }]];
		},
		commit: async () => events.push('commit'),
		rollback: async () => events.push('rollback'),
		release: () => events.push('release')
	};
}

function loadMysql(connection) {
	const driverPath = require.resolve('mysql2/promise');
	const mysqlPath = require.resolve('../src/lib/database/mysql');
	const originalDriver = require.cache[driverPath];
	const originalMysql = require.cache[mysqlPath];
	const previousUrl = process.env.DATABASE_URL;

	process.env.DATABASE_URL = 'mysql://test';
	require.cache[driverPath] = {
		id: driverPath,
		filename: driverPath,
		loaded: true,
		exports: {
			createPool: () => ({
				query: async () => {
					connection.events.push('pool-query');
					return [];
				},
				execute: async () => [],
				getConnection: async () => {
					connection.events.push('get-connection');
					return connection;
				}
			})
		}
	};
	delete require.cache[mysqlPath];
	const mysql = require(mysqlPath);

	return {
		mysql,
		restore() {
			if (previousUrl === undefined) delete process.env.DATABASE_URL;
			else process.env.DATABASE_URL = previousUrl;
			if (originalDriver) require.cache[driverPath] = originalDriver;
			else delete require.cache[driverPath];
			if (originalMysql) require.cache[mysqlPath] = originalMysql;
			else delete require.cache[mysqlPath];
		}
	};
}
