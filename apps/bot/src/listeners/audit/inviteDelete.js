const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'inviteDelete' });
	}

	async run(invite) {
		if (!invite.guild) return;
		await sendAuditLog(
			invite.guild,
			'inviteDelete',
			'Invite Deleted',
			[
				{ label: 'Code', value: invite.code, icon: emojis.custom.link },
				{ label: 'Channel', value: invite.channel ? `${invite.channel}` : 'Unknown' }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
