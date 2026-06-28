const { Listener } = require('@sapphire/framework');
const { ChannelType } = require('discord.js');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'channelCreate' });
	}

	async run(channel) {
		if (!channel.guild) return;
		if (channel.isThread?.()) return;

		const isForum = channel.type === ChannelType.GuildForum;
		await sendAuditLog(
			channel.guild,
			isForum ? 'forumCreate' : 'channelCreate',
			isForum ? 'Forum Channel Created' : 'Channel Created',
			channelDetails(channel),
			{
				color: color.success,
				emoji: emojis.custom.openfolder
			}
		);
	}
}

function channelDetails(channel) {
	return [
		{ label: 'Channel', value: `${channel} (${channel.id})`, icon: emojis.custom.openfolder },
		{ label: 'Name', value: channel.name },
		{ label: 'Type', value: channel.type },
		{ label: 'Parent', value: channel.parent ? `${channel.parent.name} (${channel.parentId})` : 'None' },
		{ label: 'Topic', value: channel.topic || 'None' },
		{ label: 'NSFW', value: channel.nsfw ?? 'Unknown' },
		{ label: 'Available Tags', value: formatForumTags(channel.availableTags) }
	].filter((detail) => detail.value !== undefined);
}

function formatForumTags(tags) {
	if (!Array.isArray(tags) || !tags.length) return undefined;
	return tags.map((tag) => tag.name).join(', ');
}

module.exports = { UserEvent };
