const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildBanAdd' });
	}

	async run(ban) {
		await sendAuditLog(
			ban.guild,
			'banAdd',
			'User Banned',
			[
				{ label: 'User', value: `${ban.user} (${ban.user.id})`, icon: emojis.custom.person },
				{ label: 'Reason', value: ban.reason || 'No reason provided.', icon: emojis.custom.pencil }
			],
			{ color: color.fail, emoji: emojis.custom.ban, user: ban.user }
		);
	}
}

module.exports = { UserEvent };
