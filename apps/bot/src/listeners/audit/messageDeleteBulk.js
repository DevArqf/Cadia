const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'messageDeleteBulk' });
	}

	async run(messages) {
		const first = messages.first();
		if (!first?.guild) return;
		await sendAuditLog(
			first.guild,
			'messageDeleteBulk',
			'Messages Bulk Deleted',
			[
				{ label: 'Channel', value: `${first.channel}`, icon: emojis.custom.openfolder },
				{ label: 'Amount', value: messages.size, icon: emojis.custom.info }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
