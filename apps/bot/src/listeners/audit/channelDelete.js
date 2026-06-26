const { Listener } = require('@sapphire/framework');
const { ChannelType } = require('discord.js');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'channelDelete' });
	}

	async run(channel) {
		if (!channel.guild) return;
		if (channel.isThread?.()) return;

		const isForum = channel.type === ChannelType.GuildForum;
		await sendAuditLog(
			channel.guild,
			isForum ? 'forumDelete' : 'channelDelete',
			isForum ? 'Forum Channel Deleted' : 'Channel Deleted',
			[
				{ label: 'Name', value: channel.name, icon: emojis.custom.openfolder },
				{ label: 'Channel ID', value: channel.id },
				{ label: 'Type', value: channel.type },
				{ label: 'Parent', value: channel.parent ? `${channel.parent.name} (${channel.parentId})` : 'None' },
				{ label: 'Topic', value: channel.topic || 'None' },
				{ label: 'Available Tags', value: formatForumTags(channel.availableTags) }
			].filter((detail) => detail.value !== undefined),
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

function formatForumTags(tags) {
	if (!Array.isArray(tags) || !tags.length) return undefined;
	return tags.map((tag) => tag.name).join(', ');
}

module.exports = { UserEvent };
