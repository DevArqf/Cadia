const { emojis } = require('../../config');
const Guild = require('../schemas/blacklistSchema');
const { PrivilegedUsers } = require('../util/constants');

const blacklistMessage = `${emojis.custom.forbidden} Sorry, but this server is **blacklisted** from using Cadia's commands. Contact <@899385550585364481> or join our [Support Server](https://discord.gg/26R7kXa6dx) for more information.`;

async function getGuildBlacklist(guildId, userId) {
	if (!guildId || PrivilegedUsers.includes(userId)) return null;
	return Guild.findOne({ guildId });
}

module.exports = {
	blacklistMessage,
	getGuildBlacklist
};
