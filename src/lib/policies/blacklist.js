const { branding, emojis } = require('../../config');
const Guild = require('../schemas/blacklistSchema');
const { PrivilegedUsers } = require('../util/constants');

const blacklistMessage = `${emojis.custom.forbidden} Sorry, but this server is **blacklisted** from using Cadia's commands. Contact <@${branding.ownerUserId}> or join our [Support Server](${branding.supportServerUrl}) for more information.`;

async function getGuildBlacklist(guildId, userId) {
	if (!guildId || PrivilegedUsers.includes(userId)) return null;
	return Guild.findOne({ guildId });
}

module.exports = {
	blacklistMessage,
	getGuildBlacklist
};
