const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'emojiUpdate' });
	}

	async run(oldEmoji, newEmoji) {
		if (oldEmoji.name === newEmoji.name) return;
		await sendAuditLog(
			newEmoji.guild,
			'emojiUpdate',
			'Emoji Updated',
			[
				{ label: 'Emoji', value: `${newEmoji} (${newEmoji.id})`, icon: emojis.custom.emoji1 },
				{ label: 'Name', value: `${oldEmoji.name} -> ${newEmoji.name}` }
			],
			{ color: color.warning, emoji: emojis.custom.pencil }
		);
	}
}

module.exports = { UserEvent };
