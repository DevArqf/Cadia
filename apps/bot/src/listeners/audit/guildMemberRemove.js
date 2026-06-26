const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');
const { recordMemberLeave } = require('../../lib/util/botAnalytics');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildMemberRemove' });
	}

	async run(member) {
		await recordMemberLeave(member);
		await sendAuditLog(
			member.guild,
			'memberRemove',
			'Member Left',
			[
				{ label: 'User', value: `${member.user} (${member.id})`, icon: emojis.custom.person },
				{
					label: 'Joined Server',
					value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown',
					icon: emojis.custom.clock
				}
			],
			{ color: color.warning, emoji: emojis.custom.warning, member }
		);
	}
}

module.exports = { UserEvent };
