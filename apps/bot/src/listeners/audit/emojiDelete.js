const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'emojiDelete' });
	}

	async run(emoji) {
		await sendAuditLog(
			emoji.guild,
			'emojiDelete',
			'Emoji Deleted',
			[
				{ label: 'Name', value: emoji.name, icon: emojis.custom.emoji1 },
				{ label: 'Emoji ID', value: emoji.id }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
