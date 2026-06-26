const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

test('model equality filters execute inside MySQL and findOne applies LIMIT 1', async () => {
	const calls = [];
	const { createModel, restore } = loadModelWithMysql({
		execute: async (sql, params) => {
			calls.push({ sql, params });
			return [[{ id: 7, data: JSON.stringify({ guildId: '123', enabled: true }) }]];
		}
	});

	try {
		const Model = createModel('test');
		const result = await Model.findOne({ guildId: '123', enabled: true });

		assert.equal(result.guildId, '123');
		assert.match(calls[0].sql, /JSON_CONTAINS\(data, \?\)/);
		assert.match(calls[0].sql, /LIMIT 1/);
		assert.deepEqual(JSON.parse(calls[0].params[1]), { guildId: '123', enabled: true });
	} finally {
		restore();
	}
});

test('model operator filters remain in memory after database narrowing', async () => {
	const calls = [];
	const { createModel, restore } = loadModelWithMysql({
		execute: async (sql, params) => {
			calls.push({ sql, params });
			return [
				[
					{ id: 1, data: { guildId: '123', status: 'active' } },
					{ id: 2, data: { guildId: '123', status: 'deleted' } }
				]
			];
		}
	});

	try {
		const Model = createModel('test');
		const results = await Model.find({ guildId: '123', status: { $ne: 'deleted' } });

		assert.equal(results.length, 1);
		assert.equal(results[0].status, 'active');
		assert.deepEqual(JSON.parse(calls[0].params[1]), { guildId: '123' });
	} finally {
		restore();
	}
});

test('model row locks append FOR UPDATE to transactional lookups', async () => {
	const calls = [];
	const { createModel, restore } = loadModelWithMysql({
		execute: async (sql) => {
			calls.push(sql);
			return [[{ id: 1, data: { userId: 'user' } }]];
		}
	});

	try {
		const Model = createModel('test');
		const result = await Model.findOneForUpdate({ userId: 'user' });

		assert.equal(result.userId, 'user');
		assert.match(calls[0], /LIMIT 1 FOR UPDATE$/);
	} finally {
		restore();
	}
});

test('model sort and limit execute inside MySQL for leaderboard queries', async () => {
	const calls = [];
	const { createModel, restore } = loadModelWithMysql({
		execute: async (sql, params) => {
			calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
			return [[{ id: 1, data: { guildId: 'guild', totalXp: 900 } }]];
		}
	});

	try {
		const Model = createModel('levels');
		const rows = await Model.find({ guildId: 'guild' }).sort({ totalXp: -1 }).limit(10);

		assert.equal(rows.length, 1);
		assert.match(calls[0].sql, /ORDER BY JSON_EXTRACT\(data, '\$\.totalXp'\) DESC, id ASC LIMIT 10$/);
	} finally {
		restore();
	}
});

function loadModelWithMysql(overrides) {
	const mysqlPath = require.resolve('../src/lib/database/mysql');
	const modelPath = require.resolve('../src/lib/database/model');
	const originalMysql = require.cache[mysqlPath];
	const originalModel = require.cache[modelPath];

	require.cache[mysqlPath] = {
		id: mysqlPath,
		filename: mysqlPath,
		loaded: true,
		exports: {
			execute: overrides.execute,
			isMysqlConnected: () => true
		}
	};
	delete require.cache[modelPath];
	const model = require(modelPath);

	return {
		...model,
		restore() {
			if (originalMysql) require.cache[mysqlPath] = originalMysql;
			else delete require.cache[mysqlPath];
			if (originalModel) require.cache[modelPath] = originalModel;
			else delete require.cache[modelPath];
		}
	};
}
