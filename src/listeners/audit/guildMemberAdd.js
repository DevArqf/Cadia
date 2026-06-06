const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildMemberAdd' });
	}

	async run(member) {
		await sendAuditLog(
			member.guild,
			'memberAdd',
			'Member Joined',
			[
				{ label: 'User', value: `${member.user} (${member.id})`, icon: emojis.custom.person },
				{ label: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, icon: emojis.custom.clock }
			],
			{ color: color.success, emoji: emojis.custom.success, member }
		);
	}
}

module.exports = { UserEvent };
