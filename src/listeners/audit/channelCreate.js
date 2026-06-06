const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'channelCreate' });
	}

	async run(channel) {
		if (!channel.guild) return;
		await sendAuditLog(channel.guild, 'channelCreate', 'Channel Created', channelDetails(channel), {
			color: color.success,
			emoji: emojis.custom.openfolder
		});
	}
}

function channelDetails(channel) {
	return [
		{ label: 'Channel', value: `${channel} (${channel.id})`, icon: emojis.custom.openfolder },
		{ label: 'Name', value: channel.name },
		{ label: 'Type', value: channel.type }
	];
}

module.exports = { UserEvent };
