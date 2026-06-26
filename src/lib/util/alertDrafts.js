const { emojis } = require('../../config');
const { alertTemplates } = require('./globalAlerts');

const DEFAULT_ALERT_FOOTER = 'Thank you to all **[TOTAL USERS]** Cadia users. This is the foundation for the next era of Cadia RPG.';

function readDraft(interaction) {
	return {
		title: normalizeOptional(interaction.options.getString('title')),
		message: normalizeAlertMessage(interaction.options.getString('message')),
		footer: normalizeOptional(interaction.options.getString('footer')) || DEFAULT_ALERT_FOOTER,
		thumbnail: normalizeOptional(interaction.options.getString('thumbnail')),
		style: interaction.options.getString('style') || null
	};
}

function readModalDraft(submitted, previousDraft) {
	return {
		...previousDraft,
		title: normalizeOptional(submitted.fields.getTextInputValue('title')),
		message: normalizeAlertMessage(submitted.fields.getTextInputValue('message')),
		footer: normalizeOptional(submitted.fields.getTextInputValue('footer')),
		thumbnail: normalizeOptional(submitted.fields.getTextInputValue('thumbnail'))
	};
}

function applyTemplate(templateKey, draft) {
	const template = alertTemplates[templateKey] ?? alertTemplates.update;
	return {
		...template,
		message: typeof template.message === 'function' ? template.message() : template.message,
		...Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== null && value !== undefined && value !== '')),
		style: draft.style || template.style || 'update'
	};
}

function resolveDraftVariables(draft, client) {
	return {
		...draft,
		title: resolveAlertVariables(draft.title, client),
		message: resolveAlertVariables(draft.message, client),
		footer: resolveAlertVariables(draft.footer, client),
		thumbnail: resolveAlertVariables(draft.thumbnail, client)
	};
}

function resolveAlertVariables(value, client) {
	if (!value) return value;
	const botIcon = client.user.displayAvatarURL({ extension: 'png', size: 256 });
	const totalUsers = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0).toLocaleString('en-US');

	return value
		.replace(/\{botIcon\}/gi, botIcon)
		.replace(/\[TOTAL USERS\]|\{totalUsers\}/gi, totalUsers)
		.replace(/\{emoji\.([a-z0-9_]+)\}/gi, (_, key) => {
			const emoji = getCustomEmoji(key);
			return emoji ?? `{emoji.${key}}`;
		});
}

function getCustomEmoji(key) {
	const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
	const aliases = {
		arrowright: 'arrowright',
		rightarrow: 'arrowright'
	};
	const emojiKey = aliases[normalized] ?? normalized;
	return emojis.custom[emojiKey] ?? null;
}

function normalizeAlertMessage(message) {
	if (message === null || message === undefined) return message;
	return normalizeDiscordSubtext(message.replace(/\\n/g, '\n')).trim();
}

function normalizeOptional(value) {
	if (value === null || value === undefined) return null;
	const normalized = value.replace(/\\n/g, '\n').trim();
	return normalized || null;
}

function normalizeDiscordSubtext(value) {
	return value.replace(/(^|\n)\s*\\?-#\s*/g, '$1-# ');
}

module.exports = {
	DEFAULT_ALERT_FOOTER,
	applyTemplate,
	normalizeAlertMessage,
	readDraft,
	readModalDraft,
	resolveDraftVariables
};
