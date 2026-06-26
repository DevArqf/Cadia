const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'emojiCreate' });
	}

	async run(emoji) {
		await sendAuditLog(emoji.guild, 'emojiCreate', 'Emoji Created', emojiDetails(emoji), { color: color.success, emoji: emojis.custom.emoji1 });
	}
}

function emojiDetails(emoji) {
	return [
		{ label: 'Emoji', value: `${emoji} (${emoji.id})`, icon: emojis.custom.emoji1 },
		{ label: 'Name', value: emoji.name },
		{ label: 'Animated', value: emoji.animated ? 'Yes' : 'No' }
	];
}

module.exports = { UserEvent };
