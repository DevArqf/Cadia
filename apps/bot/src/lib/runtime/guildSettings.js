const GuildSettings = require('../schemas/guildSettingsSchema');

const DEFAULT_PREFIX = 'cd ';
const CACHE_MS = 60_000;
const cache = new Map();

async function getGuildSettings(guildId, { fresh = false } = {}) {
	const id = String(guildId || '');
	if (!id) return { guildId: id, prefix: DEFAULT_PREFIX };

	const cached = cache.get(id);
	if (!fresh && cached?.expiresAt > Date.now()) return cached.settings;

	const record = await GuildSettings.findOne({ guildId: id });
	const settings = serializeGuildSettings(record, id);
	cache.set(id, { settings, expiresAt: Date.now() + CACHE_MS });
	return settings;
}

async function getGuildPrefix(message) {
	if (!message?.guildId) return DEFAULT_PREFIX;
	try {
		return (await getGuildSettings(message.guildId)).prefix;
	} catch {
		return DEFAULT_PREFIX;
	}
}

async function saveGuildPrefix(guildId, prefix, updatedBy = null) {
	const id = String(guildId || '');
	if (!id) throw new TypeError('A guild ID is required.');
	const normalized = normalizeGuildPrefix(prefix);
	let record = await GuildSettings.findOne({ guildId: id });
	if (!record) record = new GuildSettings({ guildId: id });
	Object.assign(record, { prefix: normalized, updatedAt: Date.now(), updatedBy });
	await record.save();

	const settings = serializeGuildSettings(record, id);
	cache.set(id, { settings, expiresAt: Date.now() + CACHE_MS });
	return settings;
}

function normalizeGuildPrefix(value) {
	if (typeof value !== 'string') throw new TypeError('Command prefix must be text.');
	if (!value.length) throw new RangeError('Command prefix cannot be empty.');
	if (value.length > 8) throw new RangeError('Command prefix cannot exceed 8 characters.');
	if (/[\r\n\t]/.test(value)) throw new RangeError('Command prefix cannot contain line breaks or tabs.');
	return value;
}

function serializeGuildSettings(record, guildId) {
	return {
		guildId: String(guildId || record?.guildId || ''),
		prefix: typeof record?.prefix === 'string' && record.prefix.length ? record.prefix : DEFAULT_PREFIX
	};
}

function clearGuildSettingsCache() {
	cache.clear();
}

module.exports = {
	DEFAULT_PREFIX,
	clearGuildSettingsCache,
	getGuildPrefix,
	getGuildSettings,
	normalizeGuildPrefix,
	saveGuildPrefix,
	serializeGuildSettings
};
