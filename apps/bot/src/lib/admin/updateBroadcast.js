const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const REQUIRED_PERMISSIONS = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];

function normalizeUpdateEmbed(input = {}) {
	const title = clean(input.title, 256);
	const description = clean(input.description, 4096);
	const fields = Array.isArray(input.fields)
		? input.fields.slice(0, 25).map((field) => ({
			name: clean(field?.name, 256),
			value: clean(field?.value, 1024),
			inline: field?.inline === true
		})).filter((field) => field.name && field.value)
		: [];
	if (!title && !description && !fields.length) throw new RangeError('Add an embed title, description, or field before sending.');

	const color = String(input.color || '#65b8da').trim();
	if (!/^#[0-9a-f]{6}$/i.test(color)) throw new RangeError('Embed color must be a 6-digit hex color.');
	const normalized = {
		title,
		description,
		url: optionalUrl(input.url, 'Title URL'),
		color,
		authorName: clean(input.authorName, 256),
		authorIconUrl: optionalUrl(input.authorIconUrl, 'Author icon URL'),
		footer: clean(input.footer, 2048),
		footerIconUrl: optionalUrl(input.footerIconUrl, 'Footer icon URL'),
		thumbnailUrl: optionalUrl(input.thumbnailUrl, 'Thumbnail URL'),
		imageUrl: optionalUrl(input.imageUrl, 'Image URL'),
		fields,
		timestamp: input.timestamp === true
	};
	const characterCount = [normalized.title, normalized.description, normalized.authorName, normalized.footer]
		.concat(fields.flatMap((field) => [field.name, field.value]))
		.reduce((total, value) => total + value.length, 0);
	if (characterCount > 6000) throw new RangeError('Embed content cannot exceed 6,000 total characters.');
	return normalized;
}

function buildUpdateEmbed(input) {
	const data = normalizeUpdateEmbed(input);
	const embed = new EmbedBuilder().setColor(data.color);
	if (data.title) embed.setTitle(data.title);
	if (data.description) embed.setDescription(data.description);
	if (data.url) embed.setURL(data.url);
	if (data.authorName) embed.setAuthor({ name: data.authorName, ...(data.authorIconUrl ? { iconURL: data.authorIconUrl } : {}) });
	if (data.footer) embed.setFooter({ text: data.footer, ...(data.footerIconUrl ? { iconURL: data.footerIconUrl } : {}) });
	if (data.thumbnailUrl) embed.setThumbnail(data.thumbnailUrl);
	if (data.imageUrl) embed.setImage(data.imageUrl);
	if (data.fields.length) embed.addFields(data.fields);
	if (data.timestamp) embed.setTimestamp();
	return embed;
}

async function sendAdminUpdate(client, payload, getSettings) {
	const target = payload.target === 'global' ? 'global' : 'guild';
	const guilds = target === 'global'
		? [...client.guilds.cache.values()]
		: [client.guilds.cache.get(String(payload.guildId || ''))].filter(Boolean);
	if (!guilds.length) throw new Error('The selected server is unavailable.');
	const embed = buildUpdateEmbed(payload.embed);
	const results = [];

	for (const guild of guilds) {
		const settings = await getSettings(guild.id).catch(() => null);
		const channelId = settings?.updateChannelId;
		if (!channelId) {
			results.push({ guildId: guild.id, guildName: guild.name, status: 'skipped', reason: 'No update channel configured.' });
			continue;
		}
		const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
		if (!channel?.isTextBased?.() || channel.isThread?.()) {
			results.push({ guildId: guild.id, guildName: guild.name, status: 'failed', reason: 'Configured update channel is unavailable.' });
			continue;
		}
		const permissions = channel.permissionsFor(guild.members.me);
		if (!permissions?.has(REQUIRED_PERMISSIONS)) {
			results.push({ guildId: guild.id, guildName: guild.name, status: 'failed', reason: 'Cadia lacks permission to send embeds in the update channel.' });
			continue;
		}
		try {
			const message = await channel.send({ embeds: [embed] });
			results.push({ guildId: guild.id, guildName: guild.name, channelId, messageId: message.id, status: 'sent' });
		} catch (error) {
			results.push({ guildId: guild.id, guildName: guild.name, status: 'failed', reason: error.message });
		}
	}

	return {
		target,
		attempted: guilds.length,
		sent: results.filter((result) => result.status === 'sent').length,
		skipped: results.filter((result) => result.status === 'skipped').length,
		failed: results.filter((result) => result.status === 'failed').length,
		results
	};
}

function clean(value, max) {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optionalUrl(value, label) {
	const url = clean(value, 2048);
	if (!url) return '';
	try {
		const parsed = new URL(url);
		if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
		return url;
	} catch {
		throw new RangeError(`${label} must be a valid HTTP or HTTPS URL.`);
	}
}

module.exports = { buildUpdateEmbed, normalizeUpdateEmbed, sendAdminUpdate };
