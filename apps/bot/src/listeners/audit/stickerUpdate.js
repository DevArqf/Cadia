const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'stickerUpdate' });
	}

	async run(oldSticker, newSticker) {
		const changes = [];
		if (oldSticker.name !== newSticker.name) changes.push({ label: 'Name', value: `${oldSticker.name} -> ${newSticker.name}` });
		if (oldSticker.description !== newSticker.description) {
			changes.push({ label: 'Description', value: `${oldSticker.description || 'None'} -> ${newSticker.description || 'None'}` });
		}
		if (!changes.length) return;
		await sendAuditLog(
			newSticker.guild,
			'stickerUpdate',
			'Sticker Updated',
			[{ label: 'Sticker ID', value: newSticker.id, icon: emojis.custom.save }, ...changes],
			{ color: color.warning, emoji: emojis.custom.pencil }
		);
	}
}

module.exports = { UserEvent };
