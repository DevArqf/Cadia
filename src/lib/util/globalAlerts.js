const {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder
} = require('discord.js');
const { branding, color, emojis } = require('../../config');
const { GlobalAlertSchema } = require('../schemas/globalAlertSchema');
const { GlobalAlertReceiptSchema } = require('../schemas/globalAlertReceiptSchema');
const { isDeveloper } = require('./authorization');

const ALERT_CACHE_MS = 15_000;
const ALERT_NUDGE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
let activeAlertCache = { expiresAt: 0, alert: null };

async function getActiveAlert({ fresh = false } = {}) {
	if (!fresh && Date.now() < activeAlertCache.expiresAt) return activeAlertCache.alert;

	const alerts = await GlobalAlertSchema.find({ active: true }).sort({ createdAt: -1 }).limit(1);
	const alert = alerts[0] ?? null;
	activeAlertCache = { expiresAt: Date.now() + ALERT_CACHE_MS, alert };
	return alert;
}

async function getAlertById(alertId) {
	if (!alertId) return null;
	return GlobalAlertSchema.findOne({ alertId });
}

async function getAlertHistory(limit = 10) {
	return GlobalAlertSchema.find({}).sort({ createdAt: -1 }).limit(limit);
}

const alertStyles = {
	update: { label: 'Update', icon: emojis.custom.update, color: color.default },
	maintenance: { label: 'Maintenance', icon: emojis.custom.maintenance, color: color.warning },
	security: { label: 'Security', icon: emojis.custom.lock, color: color.fail },
	event: { label: 'Event', icon: emojis.custom.tada1, color: color.success }
};

const alertTemplates = {
	update: {
		label: 'Update Release',
		title: 'Cadia Update Released',
		message: '**A new Cadia update is now live.**\nUse `/alert` to view the latest developer announcement.',
		footer: 'Thank you for using Cadia.',
		style: 'update'
	},
	maintenance: {
		label: 'Maintenance',
		title: 'Cadia Maintenance Notice',
		message: '**Cadia maintenance is scheduled.**\nSome commands may be temporarily unavailable while work is completed.',
		footer: 'Service will return to normal as soon as possible.',
		style: 'maintenance'
	},
	security: {
		label: 'Security Notice',
		title: 'Cadia Security Notice',
		message: '**A security-related Cadia notice has been published.**\nPlease read this alert carefully.',
		footer: 'Cadia developer notice.',
		style: 'security'
	},
	event: {
		label: 'Community Event',
		title: 'Cadia Event Announcement',
		message: '**A Cadia community event is live.**\nCheck the details below and join in when ready.',
		footer: 'Have fun.',
		style: 'event'
	}
};

async function publishAlert({ title, message, footer, thumbnail, style = 'update', accentColor, developer, dmEnabled = false }) {
	const alertStyle = alertStyles[style] ? style : 'update';
	await GlobalAlertSchema.updateOne({ active: true }, { $set: { active: false, updatedAt: Date.now() } });

	const alert = await GlobalAlertSchema.create({
		alertId: `${Date.now()}-${developer.id}`,
		active: true,
		title,
		message,
		footer,
		thumbnail,
		style: alertStyle,
		accentColor,
		developerId: developer.id,
		developerTag: developer.tag,
		dmEnabled,
		createdAt: Date.now(),
		updatedAt: Date.now()
	});

	activeAlertCache = { expiresAt: Date.now() + ALERT_CACHE_MS, alert };
	return alert;
}

async function clearActiveAlert(developer) {
	const alert = await getActiveAlert({ fresh: true });
	if (!alert) return null;

	alert.active = false;
	alert.updatedAt = Date.now();
	alert.clearedBy = developer.id;
	await alert.save();

	activeAlertCache = { expiresAt: 0, alert: null };
	return alert;
}

async function updateAlertDmStats(alert, stats) {
	if (!alert) return null;
	alert.dmSent = stats.sent;
	alert.dmFailed = stats.failed;
	alert.dmTargeted = stats.total;
	alert.updatedAt = Date.now();
	await alert.save();

	activeAlertCache = { expiresAt: Date.now() + ALERT_CACHE_MS, alert };
	return alert;
}

async function shouldSendAlertNudge(alert, userId) {
	if (!alert?.alertId || !userId) return false;

	const receipt = await getAlertReceipt(alert.alertId, userId);
	if (receipt.viewedAt) return false;
	if (!receipt.lastNudgedAt) return true;

	return Date.now() - receipt.lastNudgedAt >= ALERT_NUDGE_COOLDOWN_MS;
}

async function markAlertNudged(alert, userId) {
	if (!alert?.alertId || !userId) return null;

	const receipt = await getAlertReceipt(alert.alertId, userId);
	receipt.lastNudgedAt = Date.now();
	receipt.updatedAt = Date.now();
	await receipt.save();
	return receipt;
}

async function markAlertViewed(alert, userId) {
	if (!alert?.alertId || !userId) return null;

	const receipt = await getAlertReceipt(alert.alertId, userId);
	receipt.viewedAt = Date.now();
	receipt.updatedAt = Date.now();
	await receipt.save();
	return receipt;
}

async function getAlertReceipt(alertId, userId) {
	let receipt = await GlobalAlertReceiptSchema.findOne({ alertId, userId });
	if (!receipt) receipt = await GlobalAlertReceiptSchema.create({ alertId, userId });
	return receipt;
}

function buildAlertPanel(alert, { viewer = false, showId = false } = {}) {
	const published = alert?.createdAt ? `<t:${Math.floor(alert.createdAt / 1000)}:R>` : 'Unknown';
	const developer = alert?.developerTag ? `\`${alert.developerTag}\`` : alert?.developerId ? `<@${alert.developerId}>` : 'Cadia Developer';
	const style = alertStyles[alert?.style] ?? alertStyles.update;
	const title = alert?.title || 'Cadia Global Alert';
	const thumbnail = normalizeUrl(alert?.thumbnail);

	const header = new TextDisplayBuilder().setContent(
		`${style.icon} **${title}**\n-# ${viewer ? 'Latest developer announcement' : `${style.label} alert from the Cadia development team`}`
	);
	const container = new ContainerBuilder()
		.setAccentColor(accent(alert?.accentColor || style.color))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(alert?.message || `${emojis.custom.warning} No alert message was provided.`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`${emojis.custom.developer} **Developer:** ${developer}`,
					`${emojis.custom.clock} **Published:** ${published}`,
					showId && alert?.alertId ? `${emojis.custom.info} **Alert ID:** \`${alert.alertId}\`` : null,
					alert?.footer ? `${emojis.custom.info} ${alert.footer}` : null
				]
					.filter(Boolean)
					.join('\n')
			)
		);

	if (thumbnail) {
		container.spliceComponents(
			0,
			0,
			new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
		);
	} else {
		container.spliceComponents(0, 0, header);
	}

	return container;
}

function buildNoAlertPanel() {
	return new ContainerBuilder()
		.setAccentColor(accent(color.default))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.info} **No Active Alert**`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('There is no active alert right now.'));
}

function buildAlertNudge(alert) {
	return new ContainerBuilder()
		.setAccentColor(accent(color.warning))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.news} **Cadia Alert Available**`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`A developer posted a global alert <t:${Math.floor(alert.createdAt / 1000)}:R>.\n${emojis.custom.arrowright} Run \`</alert:${branding.alertCommandId}>\` to read it.`
			)
		);
}

function componentReply(component, ephemeral = true) {
	return {
		components: [component],
		flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
	};
}

function accent(hex = color.default) {
	return Number.parseInt(String(hex).replace('#', ''), 16);
}

function normalizeUrl(url) {
	if (!url) return null;
	return /^https?:\/\//i.test(url) ? url : null;
}

module.exports = {
	alertStyles,
	alertTemplates,
	buildAlertNudge,
	buildAlertPanel,
	buildNoAlertPanel,
	clearActiveAlert,
	componentReply,
	getAlertById,
	getAlertHistory,
	getActiveAlert,
	isDeveloper,
	markAlertNudged,
	markAlertViewed,
	publishAlert,
	shouldSendAlertNudge,
	updateAlertDmStats
};
