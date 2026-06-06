const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'channelUpdate' });
	}

	async run(oldChannel, newChannel) {
		if (!newChannel.guild) return;
		const changes = [];
		if (oldChannel.name !== newChannel.name) changes.push({ label: 'Name', value: `${oldChannel.name} -> ${newChannel.name}` });
		if (oldChannel.topic !== newChannel.topic)
			changes.push({ label: 'Topic', value: `${oldChannel.topic || 'None'} -> ${newChannel.topic || 'None'}` });
		if (oldChannel.nsfw !== newChannel.nsfw) changes.push({ label: 'NSFW', value: `${oldChannel.nsfw} -> ${newChannel.nsfw}` });
		if (!changes.length) return;
		await sendAuditLog(
			newChannel.guild,
			'channelUpdate',
			'Channel Updated',
			[{ label: 'Channel', value: `${newChannel} (${newChannel.id})`, icon: emojis.custom.openfolder }, ...changes],
			{ color: color.warning, emoji: emojis.custom.pencil }
		);
	}
}

module.exports = { UserEvent };
