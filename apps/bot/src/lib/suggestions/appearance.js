const DEFAULT_PANEL_APPEARANCE = Object.freeze({
	title: 'Server Suggestions',
	description: 'Share an idea with the community.\n\nClick **Suggest** below to submit it. Members can then upvote or downvote it.',
	footer: 'Suggestions are visible to everyone in this channel.',
	color: '#65b8da',
	thumbnailUrl: '',
	imageUrl: '',
	buttonLabel: 'Suggest',
	buttonEmoji: '✏️'
});

const DEFAULT_POST_APPEARANCE = Object.freeze({
	title: '{title}',
	description: '{body}\n\n**Upvotes:** {upvotes}\n**Downvotes:** {downvotes}\n**Suggested by:** {author}',
	footer: 'Suggestion ID: {id}',
	color: '#65b8da',
	thumbnailUrl: '',
	imageUrl: '',
	showTimestamp: true,
	style: 'embed'
});

function normalizeSuggestionAppearance(config = {}) {
	return {
		style: config.style === 'message' ? 'message' : config.style === 'componentsV2' ? 'componentsV2' : 'embed',
		panel: normalizePanelAppearance(config.panel),
		post: normalizePostAppearance(config.post)
	};
}

function normalizePanelAppearance(value = {}) {
	return {
		title: cleanText(value?.title, DEFAULT_PANEL_APPEARANCE.title, 256),
		description: cleanText(value?.description, DEFAULT_PANEL_APPEARANCE.description, 4000),
		footer: cleanText(value?.footer, DEFAULT_PANEL_APPEARANCE.footer, 2000),
		color: normalizeColor(value?.color, DEFAULT_PANEL_APPEARANCE.color),
		thumbnailUrl: normalizeAssetUrl(value?.thumbnailUrl),
		imageUrl: normalizeAssetUrl(value?.imageUrl),
		buttonLabel: cleanText(value?.buttonLabel, DEFAULT_PANEL_APPEARANCE.buttonLabel, 80) || DEFAULT_PANEL_APPEARANCE.buttonLabel,
		buttonEmoji: normalizeButtonEmoji(value?.buttonEmoji)
	};
}

function normalizePostAppearance(value = {}) {
	return {
		title: cleanText(value?.title, DEFAULT_POST_APPEARANCE.title, 500),
		description: cleanText(value?.description, DEFAULT_POST_APPEARANCE.description, 4000),
		footer: cleanText(value?.footer, DEFAULT_POST_APPEARANCE.footer, 2000),
		color: normalizeColor(value?.color, DEFAULT_POST_APPEARANCE.color),
		thumbnailUrl: normalizeAssetUrl(value?.thumbnailUrl),
		imageUrl: normalizeAssetUrl(value?.imageUrl),
		showTimestamp: value?.showTimestamp !== false,
		style: value?.style === 'componentsV2' ? 'componentsV2' : 'embed'
	};
}

function renderTemplate(template, variables, maxLength) {
	const rendered = String(template || '').replace(/\{([a-z]+)\}/gi, (match, key) =>
		Object.prototype.hasOwnProperty.call(variables, key.toLowerCase()) ? String(variables[key.toLowerCase()] ?? '') : match
	);
	return rendered.slice(0, maxLength);
}

function cleanText(value, fallback, maxLength) {
	if (value === undefined || value === null) return fallback;
	return String(value)
		.replace(/\r\n?/g, '\n')
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.slice(0, maxLength);
}

function normalizeColor(value, fallback = '#65b8da') {
	const color = String(value || '').trim();
	return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function normalizeUrl(value) {
	const url = String(value || '').trim();
	if (!url) return '';
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' ? parsed.toString().slice(0, 2000) : '';
	} catch {
		return '';
	}
}

function normalizeAssetUrl(value) {
	return String(value || '').trim() === '{serverIcon}' ? '{serverIcon}' : normalizeUrl(value);
}

function normalizeButtonEmoji(value) {
	if (value === undefined || value === null) return DEFAULT_PANEL_APPEARANCE.buttonEmoji;
	const emoji = cleanText(value, '', 100).trim();
	if (!emoji) return '';
	if (/^<a?:[a-z0-9_]{2,32}:\d{17,20}>$/i.test(emoji)) return emoji;
	if (/^[a-z0-9_]{2,32}:\d{17,20}$/i.test(emoji)) return emoji;
	if (/\p{Extended_Pictographic}/u.test(emoji)) return emoji;
	return DEFAULT_PANEL_APPEARANCE.buttonEmoji;
}

module.exports = {
	DEFAULT_PANEL_APPEARANCE,
	DEFAULT_POST_APPEARANCE,
	normalizeColor,
	normalizeButtonEmoji,
	normalizeSuggestionAppearance,
	normalizeUrl,
	renderTemplate
};
