const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'channelDelete' });
	}

	async run(channel) {
		if (!channel.guild) return;
		await sendAuditLog(
			channel.guild,
			'channelDelete',
			'Channel Deleted',
			[
				{ label: 'Name', value: channel.name, icon: emojis.custom.openfolder },
				{ label: 'Channel ID', value: channel.id },
				{ label: 'Type', value: channel.type }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
