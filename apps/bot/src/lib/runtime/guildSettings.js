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
	return saveGuildSettings(guildId, { prefix }, updatedBy);
}

async function saveGuildSettings(guildId, input = {}, updatedBy = null) {
	const id = String(guildId || '');
	if (!id) throw new TypeError('A guild ID is required.');
	let record = await GuildSettings.findOne({ guildId: id });
	if (!record) record = new GuildSettings({ guildId: id });
	if (Object.hasOwn(input, 'prefix')) record.prefix = normalizeGuildPrefix(input.prefix);
	if (Object.hasOwn(input, 'updateChannelId')) record.updateChannelId = normalizeUpdateChannelId(input.updateChannelId);
	Object.assign(record, { updatedAt: Date.now(), updatedBy });
	await record.save();

	const settings = serializeGuildSettings(record, id);
	cache.set(id, { settings, expiresAt: Date.now() + CACHE_MS });
	return settings;
}

function normalizeUpdateChannelId(value) {
	if (value === null || value === undefined || value === '') return null;
	const id = String(value).trim();
	if (!/^\d{17,20}$/.test(id)) throw new RangeError('Update channel must be a valid Discord channel ID.');
	return id;
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
		prefix: typeof record?.prefix === 'string' && record.prefix.length ? record.prefix : DEFAULT_PREFIX,
		updateChannelId: normalizeUpdateChannelId(record?.updateChannelId)
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
	normalizeUpdateChannelId,
	saveGuildSettings,
	saveGuildPrefix,
	serializeGuildSettings
};
