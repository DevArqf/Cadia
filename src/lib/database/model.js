const { execute, isMysqlConnected } = require('./mysql');

class DbQuery {
	constructor(executor) {
		this.executor = executor;
		this.sortSpec = null;
		this.limitCount = null;
	}

	sort(spec) {
		this.sortSpec = spec;
		return this;
	}

	limit(count) {
		this.limitCount = count;
		return this;
	}

	async exec() {
		let rows = await this.executor();

		if (this.sortSpec) {
			const [[field, direction]] = Object.entries(this.sortSpec);
			rows = rows.sort((a, b) => {
				const left = a[field] ?? 0;
				const right = b[field] ?? 0;
				return direction < 0 ? right - left : left - right;
			});
		}

		if (typeof this.limitCount === 'number') rows = rows.slice(0, this.limitCount);

		return rows;
	}

	then(resolve, reject) {
		return this.exec().then(resolve, reject);
	}

	catch(reject) {
		return this.exec().catch(reject);
	}
}

function matchesFilter(document, filter = {}) {
	return Object.entries(filter).every(([key, expected]) => {
		const actual = document[key];

		if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
			if (Object.prototype.hasOwnProperty.call(expected, '$ne')) return actual !== expected.$ne;
		}

		return actual === expected;
	});
}

function splitFilter(filter = {}) {
	const databaseFilter = {};
	const memoryFilter = {};

	for (const [key, expected] of Object.entries(filter)) {
		if (isDatabaseComparable(expected)) databaseFilter[key] = expected;
		else memoryFilter[key] = expected;
	}

	return { databaseFilter, memoryFilter };
}

function isDatabaseComparable(value) {
	return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function normalizeUpdate(document, update = {}) {
	if (update.$set || update.$inc) {
		const next = { ...(update.$set || {}) };
		for (const [key, value] of Object.entries(update.$inc || {})) {
			next[key] = (document[key] ?? 0) + value;
		}
		return next;
	}

	return update;
}

function createDocument(Model, dbId, data) {
	const document = new Model(data);
	Object.defineProperty(document, '__db_id', { value: dbId, writable: true, enumerable: false });
	return document;
}

function createModel(modelName, defaults = {}) {
	class Model {
		constructor(data = {}) {
			Object.assign(this, { ...resolveDefaults(defaults), ...data });
		}

		async save() {
			const data = toPlainObject(this);

			if (this.__db_id) {
				await execute('UPDATE cadia_documents SET data = ? WHERE id = ?', [JSON.stringify(data), this.__db_id]);
				return this;
			}

			const [result] = await execute('INSERT INTO cadia_documents (model, data) VALUES (?, ?)', [modelName, JSON.stringify(data)]);
			Object.defineProperty(this, '__db_id', { value: result.insertId, writable: true, enumerable: false });
			return this;
		}

		static async _allRows() {
			if (!isMysqlConnected()) return [];
			const [rows] = await execute('SELECT id, data FROM cadia_documents WHERE model = ? ORDER BY id ASC', [modelName]);
			return deserializeRows(rows);
		}

		static async _matchingRows(filter = {}, limit = null, { forUpdate = false } = {}) {
			if (!isMysqlConnected()) return [];
			const { databaseFilter, memoryFilter } = splitFilter(filter);
			const hasDatabaseFilter = Object.keys(databaseFilter).length > 0;
			const canLimitInDatabase = Object.keys(memoryFilter).length === 0 && Number.isInteger(limit);
			const sql = [
				'SELECT id, data FROM cadia_documents WHERE model = ?',
				hasDatabaseFilter ? 'AND JSON_CONTAINS(data, ?)' : '',
				'ORDER BY id ASC',
				canLimitInDatabase ? `LIMIT ${Math.max(limit, 0)}` : '',
				forUpdate ? 'FOR UPDATE' : ''
			]
				.filter(Boolean)
				.join(' ');
			const params = [modelName];
			if (hasDatabaseFilter) params.push(JSON.stringify(databaseFilter));

			const [rows] = await execute(sql, params);
			const documents = deserializeRows(rows).filter((row) => matchesFilter(row.data, memoryFilter));
			return Number.isInteger(limit) ? documents.slice(0, limit) : documents;
		}

		static find(filter = {}) {
			return new DbQuery(async () => {
				const rows = await this._matchingRows(filter);
				return rows.map((row) => createDocument(this, row.id, row.data));
			});
		}

		static async findOne(filter = {}) {
			const [row] = await this._matchingRows(filter, 1);
			return row ? createDocument(this, row.id, row.data) : null;
		}

		static async findOneForUpdate(filter = {}) {
			const [row] = await this._matchingRows(filter, 1, { forUpdate: true });
			return row ? createDocument(this, row.id, row.data) : null;
		}

		static async create(data) {
			const document = new this(data);
			return document.save();
		}

		static async updateOne(filter, update) {
			const document = await this.findOne(filter);
			if (!document) return { matchedCount: 0, modifiedCount: 0 };

			Object.assign(document, normalizeUpdate(document, update));
			await document.save();
			return { matchedCount: 1, modifiedCount: 1 };
		}

		static async findOneAndUpdate(filter, update, options = {}) {
			let document = await this.findOne(filter);
			if (!document && options.upsert) document = new this(filter);
			if (!document) return null;

			Object.assign(document, normalizeUpdate(document, update));
			await document.save();
			return document;
		}

		static async findOneAndDelete(filter) {
			const document = await this.findOne(filter);
			if (!document) return null;

			await execute('DELETE FROM cadia_documents WHERE id = ?', [document.__db_id]);
			return document;
		}

		static async deleteOne(filter) {
			const document = await this.findOne(filter);
			if (!document) return { deletedCount: 0 };

			await execute('DELETE FROM cadia_documents WHERE id = ?', [document.__db_id]);
			return { deletedCount: 1 };
		}

		static async deleteMany(filter = {}) {
			const documents = await this.find(filter);
			if (!documents.length) return { deletedCount: 0 };

			const placeholders = documents.map(() => '?').join(',');
			await execute(
				`DELETE FROM cadia_documents WHERE id IN (${placeholders})`,
				documents.map((document) => document.__db_id)
			);
			return { deletedCount: documents.length };
		}
	}

	return Model;
}

function toPlainObject(document) {
	const data = {};
	for (const [key, value] of Object.entries(document)) data[key] = value;
	return data;
}

function deserializeRows(rows) {
	return rows.map((row) => ({
		id: row.id,
		data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
	}));
}

function resolveDefaults(defaults) {
	const resolved = {};
	for (const [key, value] of Object.entries(defaults)) {
		resolved[key] = typeof value === 'function' ? value() : value;
	}
	return resolved;
}

module.exports = {
	createModel,
	splitFilter
};
