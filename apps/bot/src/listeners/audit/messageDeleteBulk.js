const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'messageDeleteBulk' });
	}

	async run(messages) {
		const userMessages = messages.filter((message) => !message.author?.bot);
		const first = userMessages.first();
		if (!first?.guild) return;
		await sendAuditLog(
			first.guild,
			'messageDeleteBulk',
			'Messages Bulk Deleted',
			[
				{ label: 'Channel', value: `${first.channel}`, icon: emojis.custom.openfolder },
				{ label: 'Amount', value: userMessages.size, icon: emojis.custom.info }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
