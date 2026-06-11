const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'messageDelete' });
	}

	async run(message) {
		if (!message.guild || message.author?.bot) return;
		const author = message.author;
		await sendAuditLog(
			message.guild,
			'messageDelete',
			'Message Deleted',
			[
				{ label: 'Author', value: author ? `${author} (${author.id})` : 'Unknown user', icon: emojis.custom.person },
				{
					label: 'Channel',
					value: message.channel ? `${message.channel}` : `Unknown channel (${message.channelId || 'unknown id'})`,
					icon: emojis.custom.openfolder
				},
				{ label: 'Content', value: message.content || 'No text content captured.', icon: emojis.custom.pencil }
			],
			{ color: color.fail, emoji: emojis.custom.trash, user: author }
		);
	}
}

module.exports = { UserEvent };
