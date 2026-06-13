const { Listener } = require('@sapphire/framework');
const { ChannelType } = require('discord.js');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'channelUpdate' });
	}

	async run(oldChannel, newChannel) {
		if (!newChannel.guild) return;
		if (newChannel.isThread?.()) return;

		const isForum = newChannel.type === ChannelType.GuildForum;
		const changes = [];
		if (oldChannel.name !== newChannel.name) changes.push({ label: 'Name', value: `${oldChannel.name} -> ${newChannel.name}` });
		if (oldChannel.topic !== newChannel.topic)
			changes.push({ label: 'Topic', value: `${oldChannel.topic || 'None'} -> ${newChannel.topic || 'None'}` });
		if (oldChannel.nsfw !== newChannel.nsfw) changes.push({ label: 'NSFW', value: `${oldChannel.nsfw} -> ${newChannel.nsfw}` });
		if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
			changes.push({ label: 'Slowmode', value: `${oldChannel.rateLimitPerUser || 0}s -> ${newChannel.rateLimitPerUser || 0}s` });
		if (oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration)
			changes.push({
				label: 'Default Auto Archive',
				value: `${oldChannel.defaultAutoArchiveDuration || 'None'} min -> ${newChannel.defaultAutoArchiveDuration || 'None'} min`
			});
		if (oldChannel.defaultThreadRateLimitPerUser !== newChannel.defaultThreadRateLimitPerUser)
			changes.push({
				label: 'Default Thread Slowmode',
				value: `${oldChannel.defaultThreadRateLimitPerUser || 0}s -> ${newChannel.defaultThreadRateLimitPerUser || 0}s`
			});
		if (oldChannel.defaultSortOrder !== newChannel.defaultSortOrder)
			changes.push({
				label: 'Default Sort Order',
				value: `${oldChannel.defaultSortOrder ?? 'None'} -> ${newChannel.defaultSortOrder ?? 'None'}`
			});
		if (oldChannel.defaultForumLayout !== newChannel.defaultForumLayout)
			changes.push({
				label: 'Forum Layout',
				value: `${oldChannel.defaultForumLayout ?? 'None'} -> ${newChannel.defaultForumLayout ?? 'None'}`
			});
		if (formatForumTags(oldChannel.availableTags) !== formatForumTags(newChannel.availableTags))
			changes.push({
				label: 'Available Tags',
				value: `${formatForumTags(oldChannel.availableTags) || 'None'} -> ${formatForumTags(newChannel.availableTags) || 'None'}`
			});
		if (!changes.length) return;
		await sendAuditLog(
			newChannel.guild,
			isForum ? 'forumUpdate' : 'channelUpdate',
			isForum ? 'Forum Channel Updated' : 'Channel Updated',
			[{ label: 'Channel', value: `${newChannel} (${newChannel.id})`, icon: emojis.custom.openfolder }, ...changes],
			{ color: color.warning, emoji: emojis.custom.pencil }
		);
	}
}

function formatForumTags(tags) {
	if (!Array.isArray(tags) || !tags.length) return undefined;
	return tags.map((tag) => `${tag.name}${tag.moderated ? ' (moderated)' : ''}`).join(', ');
}

module.exports = { UserEvent };
