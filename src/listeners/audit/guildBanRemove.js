const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildBanRemove' });
	}

	async run(ban) {
		await sendAuditLog(
			ban.guild,
			'banRemove',
			'User Unbanned',
			[{ label: 'User', value: `${ban.user} (${ban.user.id})`, icon: emojis.custom.person }],
			{ color: color.success, emoji: emojis.custom.success, user: ban.user }
		);
	}
}

module.exports = { UserEvent };
