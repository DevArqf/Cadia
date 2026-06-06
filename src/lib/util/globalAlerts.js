const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const { color, emojis } = require('../../config');
const { GlobalAlertSchema } = require('../schemas/globalAlertSchema');

const ALERT_CACHE_MS = 15_000;
let activeAlertCache = { expiresAt: 0, alert: null };

async function getActiveAlert({ fresh = false } = {}) {
	if (!fresh && Date.now() < activeAlertCache.expiresAt) return activeAlertCache.alert;

	const alerts = await GlobalAlertSchema.find({ active: true }).sort({ createdAt: -1 }).limit(1);
	const alert = alerts[0] ?? null;
	activeAlertCache = { expiresAt: Date.now() + ALERT_CACHE_MS, alert };
	return alert;
}

async function publishAlert({ message, developer }) {
	await GlobalAlertSchema.updateOne({ active: true }, { $set: { active: false, updatedAt: Date.now() } });

	const alert = await GlobalAlertSchema.create({
		alertId: `${Date.now()}-${developer.id}`,
		active: true,
		message,
		developerId: developer.id,
		developerTag: developer.tag,
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
	alert.updatedAt = Date.now();
	await alert.save();

	activeAlertCache = { expiresAt: Date.now() + ALERT_CACHE_MS, alert };
	return alert;
}

function buildAlertPanel(alert, { viewer = false } = {}) {
	const published = alert?.createdAt ? `<t:${Math.floor(alert.createdAt / 1000)}:R>` : 'Unknown';
	const developer = alert?.developerTag ? `\`${alert.developerTag}\`` : alert?.developerId ? `<@${alert.developerId}>` : 'Cadia Developer';

	return new ContainerBuilder()
		.setAccentColor(accent(color.warning))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.news} **Cadia Global Alert**\n-# ${viewer ? 'Latest developer announcement' : 'Sent by the Cadia development team'}`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(alert?.message || `${emojis.custom.warning} No alert message was provided.`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[`${emojis.custom.developer} **Developer:** ${developer}`, `${emojis.custom.clock} **Published:** ${published}`].join('\n')
			)
		);
}

function buildNoAlertPanel() {
	return new ContainerBuilder()
		.setAccentColor(accent(color.default))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.info} **No Active Alert**`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('There is no active Cadia developer alert right now.'));
}

function buildAlertNudge(alert) {
	return new ContainerBuilder()
		.setAccentColor(accent(color.warning))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.news} **Cadia Alert Available**`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`A developer posted a global alert <t:${Math.floor(alert.createdAt / 1000)}:R>.\n${emojis.custom.arrowright} Run \`/alert\` to read it.`
			)
		);
}

function componentReply(component, ephemeral = true) {
	return {
		components: [component],
		flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
	};
}

function isDeveloper(userId) {
	return (process.env.DEVELOPERS ?? '').split(/\s+/).filter(Boolean).includes(userId);
}

function accent(hex = color.default) {
	return Number.parseInt(String(hex).replace('#', ''), 16);
}

module.exports = {
	buildAlertNudge,
	buildAlertPanel,
	buildNoAlertPanel,
	clearActiveAlert,
	componentReply,
	getActiveAlert,
	isDeveloper,
	publishAlert,
	updateAlertDmStats
};
