const fs = require('node:fs');
const path = require('node:path');
const { isMysqlConnected } = require('../database/mysql');
const { RuntimeConfigSchema } = require('../schemas/runtimeConfigSchema');

const defaultsPath = path.resolve(__dirname, '..', '..', '..', 'config', 'runtime.defaults.json');
const cache = new Map();
let defaultsCache = null;
let lastRefresh = 0;
const refreshIntervalMs = 30_000;

async function getRuntimeConfig(key, fallback = null) {
	await refreshRuntimeConfig();
	if (cache.has(key)) return cache.get(key);
	const defaults = readDefaults();
	return Object.prototype.hasOwnProperty.call(defaults, key) ? defaults[key] : fallback;
}

async function setRuntimeConfig(key, value, updatedBy = null) {
	const record = await RuntimeConfigSchema.findOneAndUpdate(
		{ key },
		{ key, value, updatedAt: Date.now(), updatedBy },
		{ upsert: true }
	);
	cache.set(key, value);
	lastRefresh = Date.now();
	return record;
}

async function refreshRuntimeConfig({ force = false } = {}) {
	const now = Date.now();
	if (!force && now - lastRefresh < refreshIntervalMs) return cache;
	lastRefresh = now;
	if (!isMysqlConnected()) return cache;

	const records = await RuntimeConfigSchema.find();
	cache.clear();
	for (const record of records) {
		if (record.key) cache.set(record.key, record.value);
	}
	return cache;
}

function readDefaults() {
	if (defaultsCache) return defaultsCache;
	try {
		defaultsCache = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
	} catch {
		defaultsCache = {};
	}
	return defaultsCache;
}

function clearRuntimeConfigCache() {
	cache.clear();
	defaultsCache = null;
	lastRefresh = 0;
}

module.exports = {
	clearRuntimeConfigCache,
	getRuntimeConfig,
	refreshRuntimeConfig,
	setRuntimeConfig
};
