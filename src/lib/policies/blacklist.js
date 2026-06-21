const { branding, emojis } = require('../../config');
const Guild = require('../schemas/blacklistSchema');
const { PrivilegedUsers } = require('../util/constants');

const blacklistMessage = `${emojis.custom.forbidden} Sorry, but this server is **blacklisted** from using Cadia's commands. Contact <@${branding.ownerUserId}> or join our [Support Server](${branding.supportServerUrl}) for more information.`;
const blacklistCache = new Map();
let cacheReady = false;
let cachePromise = null;

async function initializeBlacklistCache() {
	if (cacheReady) return blacklistCache;
	if (cachePromise) return cachePromise;

	cachePromise = Guild.find({})
		.then((entries) => {
			blacklistCache.clear();
			for (const entry of entries) blacklistCache.set(entry.guildId, entry);
			cacheReady = true;
			return blacklistCache;
		})
		.finally(() => {
			cachePromise = null;
		});
	return cachePromise;
}

async function getGuildBlacklist(guildId, userId) {
	if (!guildId || PrivilegedUsers.includes(userId)) return null;
	if (cacheReady) return blacklistCache.get(guildId) ?? null;

	const entry = await Guild.findOne({ guildId });
	if (entry) blacklistCache.set(guildId, entry);
	return entry;
}

function cacheGuildBlacklist(entry) {
	if (!entry?.guildId) return;
	blacklistCache.set(entry.guildId, entry);
}

function removeGuildBlacklistFromCache(guildId) {
	blacklistCache.delete(guildId);
}

module.exports = {
	blacklistMessage,
	cacheGuildBlacklist,
	initializeBlacklistCache,
	removeGuildBlacklistFromCache,
	getGuildBlacklist
};
