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
				{ label: 'Content', value: formatDeletedMessageContent(message.content), icon: emojis.custom.pencil }
			],
			{ color: color.fail, emoji: emojis.custom.trash, mediaURLs: deletedMessageImageUrls(message), user: author }
		);
	}
}

function formatDeletedMessageContent(content) {
	const text = content || 'No text content captured.';
	return `\`${String(text).replaceAll('`', '\\`')}\``;
}

function deletedMessageImageUrls(message) {
	return Array.from(message.attachments?.values?.() || [])
		.filter((attachment) => attachment.contentType?.startsWith('image/') || hasImageExtension(attachment.name))
		.map((attachment) => attachment.url)
		.filter(Boolean);
}

function hasImageExtension(filename) {
	return /\.(avif|gif|jpe?g|png|webp)$/i.test(filename || '');
}

module.exports = { UserEvent, deletedMessageImageUrls, formatDeletedMessageContent };
