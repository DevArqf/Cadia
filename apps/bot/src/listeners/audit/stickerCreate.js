const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'stickerCreate' });
	}

	async run(sticker) {
		await sendAuditLog(sticker.guild, 'stickerCreate', 'Sticker Created', stickerDetails(sticker), {
			color: color.success,
			emoji: emojis.custom.save
		});
	}
}

function stickerDetails(sticker) {
	return [
		{ label: 'Name', value: sticker.name, icon: emojis.custom.save },
		{ label: 'Sticker ID', value: sticker.id },
		{ label: 'Description', value: sticker.description || 'None' }
	];
}

module.exports = { UserEvent };
