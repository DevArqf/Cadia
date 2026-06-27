const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'stickerDelete' });
	}

	async run(sticker) {
		await sendAuditLog(
			sticker.guild,
			'stickerDelete',
			'Sticker Deleted',
			[
				{ label: 'Name', value: sticker.name, icon: emojis.custom.save },
				{ label: 'Sticker ID', value: sticker.id }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
