const { normalizeButtonEmoji, normalizeColor, normalizeUrl, renderTemplate } = require('../suggestions/appearance');

const DEFAULT_TICKET_PANEL = Object.freeze({
	title: 'Need help?',
	description: 'Open a ticket and the support team will help you as soon as possible.\n\n**Limit:** {maxOpen} open ticket(s) per member.',
	footer: 'Cadia Ticket System',
	authorName: '',
	authorIconUrl: '',
	footerIconUrl: '',
	color: '#65b8da',
	thumbnailUrl: '',
	imageUrl: '',
	showTimestamp: false,
	buttonLabel: 'Open Ticket',
	buttonEmoji: '📨',
	controlType: 'button',
	style: 'embed',
	componentsV2: Object.freeze({
		showSeparators: true,
		showDivider: true,
		separatorSpacing: 'small',
		useThumbnailSection: true,
		useMediaGallery: true
	})
});

const DEFAULT_OPENED_TICKET = Object.freeze({
	title: 'Ticket #{ticketNumber}',
	description: '**Opened By:** {user}\n**Created:** {created}\n\nDescribe what you need help with. Staff can claim this ticket and close it when the issue is resolved.',
	footer: '{panelTitle}',
	authorName: '',
	authorIconUrl: '',
	footerIconUrl: '',
	color: '#65b8da',
	thumbnailUrl: '',
	imageUrl: '',
	showTimestamp: false,
	style: 'embed'
});

function normalizeTicketAppearance(config = {}) {
	const legacyPanel = config.panel || { title: config.title, description: config.description };
	return {
		panel: normalizeEmbed(legacyPanel, DEFAULT_TICKET_PANEL, true),
		openedTicket: normalizeEmbed(config.openedTicket, DEFAULT_OPENED_TICKET, false)
	};
}

function normalizeEmbed(value = {}, defaults, includeButton) {
	const normalized = {
		title: text(value?.title, defaults.title, 256),
		description: text(value?.description, defaults.description, 4000),
		footer: text(value?.footer, defaults.footer, 2000),
		authorName: text(value?.authorName, defaults.authorName, 256),
		authorIconUrl: normalizeAssetUrl(value?.authorIconUrl),
		footerIconUrl: normalizeAssetUrl(value?.footerIconUrl),
		color: normalizeColor(value?.color, defaults.color),
		thumbnailUrl: normalizeAssetUrl(value?.thumbnailUrl),
		imageUrl: normalizeAssetUrl(value?.imageUrl),
		showTimestamp: value?.showTimestamp === true,
		style: value?.style === 'componentsV2' ? 'componentsV2' : 'embed'
	};
	if (includeButton) {
		normalized.buttonLabel = text(value?.buttonLabel, defaults.buttonLabel, 80).trim() || defaults.buttonLabel;
		normalized.buttonEmoji = value?.buttonEmoji === undefined ? defaults.buttonEmoji : normalizeButtonEmoji(value.buttonEmoji);
		normalized.controlType = value?.controlType === 'select' ? 'select' : 'button';
		normalized.componentsV2 = normalizeComponentsV2(value?.componentsV2);
	}
	return normalized;
}

function normalizeComponentsV2(value = {}) {
	return {
		showSeparators: value.showSeparators !== false,
		showDivider: value.showDivider !== false,
		separatorSpacing: value.separatorSpacing === 'large' ? 'large' : 'small',
		useThumbnailSection: value.useThumbnailSection !== false,
		useMediaGallery: value.useMediaGallery !== false
	};
}

function normalizeAssetUrl(value) {
	return String(value || '').trim() === '{serverIcon}' ? '{serverIcon}' : normalizeUrl(value);
}

function renderTicketTemplate(template, variables, maxLength) {
	return renderTemplate(template, variables, maxLength);
}

function text(value, fallback, maxLength) {
	if (value === undefined || value === null) return fallback;
	return String(value).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLength);
}

module.exports = { DEFAULT_OPENED_TICKET, DEFAULT_TICKET_PANEL, normalizeTicketAppearance, renderTicketTemplate };
