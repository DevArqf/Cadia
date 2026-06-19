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
