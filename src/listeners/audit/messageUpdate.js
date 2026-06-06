const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'messageUpdate' });
	}

	async run(oldMessage, newMessage) {
		if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
		await sendAuditLog(
			newMessage.guild,
			'messageUpdate',
			'Message Edited',
			[
				{ label: 'Author', value: `${newMessage.author} (${newMessage.author.id})`, icon: emojis.custom.person },
				{ label: 'Channel', value: `${newMessage.channel}`, icon: emojis.custom.openfolder },
				{ label: 'Before', value: oldMessage.content || 'No previous content captured.', icon: emojis.custom.pencil },
				{ label: 'After', value: newMessage.content || 'No new content captured.', icon: emojis.custom.success }
			],
			{ color: color.warning, emoji: emojis.custom.pencil, user: newMessage.author }
		);
	}
}

module.exports = { UserEvent };
