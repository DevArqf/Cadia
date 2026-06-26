const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'inviteCreate' });
	}

	async run(invite) {
		if (!invite.guild) return;
		await sendAuditLog(
			invite.guild,
			'inviteCreate',
			'Invite Created',
			[
				{ label: 'Code', value: invite.code, icon: emojis.custom.link },
				{ label: 'Channel', value: invite.channel ? `${invite.channel}` : 'Unknown' },
				{ label: 'Inviter', value: invite.inviter ? `${invite.inviter} (${invite.inviter.id})` : 'Unknown' },
				{ label: 'Max Uses', value: invite.maxUses || 'Unlimited' }
			],
			{ color: color.success, emoji: emojis.custom.link }
		);
	}
}

module.exports = { UserEvent };
