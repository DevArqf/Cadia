const {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} = require('discord.js');
const { color, emojis } = require('../../config');
const { alertStyles, alertTemplates, buildAlertPanel, componentReply, publishAlert, updateAlertDmStats } = require('./globalAlerts');
const { commandMention } = require('./commandMentions');
const { notice, panel } = require('./components');
const LevelSchema = require('../schemas/levelSchema');
const { GlobalAlertReceiptSchema } = require('../schemas/globalAlertReceiptSchema');
const { RpgAccessSchema } = require('../schemas/RPG System/rpgAccessSchema');
const { RpgProfileSchema } = require('../schemas/RPG System/rpgProfileSchema');
const { RpgTutorialSchema } = require('../schemas/RPG System/rpgTutorialSchema');
const { TicketSchema } = require('../schemas/ticketSchema');
const { UserSettingsSchema } = require('../schemas/usersettingSchema');

const DEFAULT_ALERT_FOOTER = 'Thank you to all **[TOTAL USERS]** Cadia users. This is the foundation for the next era of Cadia RPG.';

function addDraftOptions(builder, { messageRequired = false } = {}) {
	return builder
		.addStringOption((option) =>
			option
				.setName('message')
				.setDescription('Alert message. Supports \\n, markdown, -# subtext, emojis, and alert variables.')
				.setMaxLength(1800)
				.setRequired(messageRequired)
		)
		.addStringOption((option) => option.setName('title').setDescription('Custom alert title').setMaxLength(120).setRequired(false))
		.addStringOption((option) => option.setName('footer').setDescription('Custom alert footer').setMaxLength(300).setRequired(false))
		.addStringOption((option) =>
			option.setName('thumbnail').setDescription('HTTPS thumbnail URL or {botIcon}').setMaxLength(500).setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName('style')
				.setDescription('Alert visual style')
				.setRequired(false)
				.addChoices(...Object.entries(alertStyles).map(([value, style]) => ({ name: style.label, value })))
		)
		.addBooleanOption((option) => option.setName('dm-users').setDescription('Also DM every unique non-bot user Cadia can see').setRequired(false))
		.addBooleanOption((option) =>
			option.setName('export-csv').setDescription('Attach a CSV report of successful and failed user DMs').setRequired(false)
		);
}

function addTemplateOption(builder) {
	return builder.addStringOption((option) =>
		option
			.setName('template')
			.setDescription('Premade alert template')
			.setRequired(true)
			.addChoices(...Object.entries(alertTemplates).map(([value, template]) => ({ name: template.label, value })))
	);
}

async function publishDraft(interaction, draft, dmUsers, fromPreview = false, options = {}) {
	if (!fromPreview) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const alert = await publishAlert({ ...draft, developer: interaction.user, dmEnabled: dmUsers });
	const targetData = dmUsers ? await collectBroadcastUserIds(interaction.client) : { userGuilds: new Map(), userIds: new Set(), sources: {} };
	if (dmUsers) await options.onTargetsCollected?.(targetData);
	const stats = dmUsers
		? await sendUserDms(interaction.client, alert, targetData, { onProgress: options.onProgress })
		: { sent: 0, failed: 0, total: 0, sources: {} };
	await options.onBroadcastComplete?.(stats);
	await updateAlertDmStats(alert, stats);
	const csvAttachment = options.exportCsv && dmUsers ? createDmReportAttachment(alert, stats.deliveries) : null;

	const response = {
		...componentReply(
			panel({
				accentColor: color.success,
				title: `${emojis.custom.success} **Global Alert Published**`,
				subtitle: dmUsers ? 'User DM broadcast complete' : 'DM broadcast skipped',
				sections: [
					`${emojis.custom.info} **Alert ID:** \`${alert.alertId}\``,
					`${emojis.custom.success} **Final Status:** Published successfully`,
					`${emojis.custom.mail} **User DMs Sent:** ${stats.sent}`,
					`${emojis.custom.warning} **User DMs Failed:** ${stats.failed}`,
					`${emojis.custom.community} **Unique Users Targeted:** ${stats.total}`,
					`${emojis.custom.openfolder} **Target Sources:** ${formatTargetSources(stats.sources)}`,
					`${emojis.custom.info} **DM Broadcast:** ${dmUsers ? 'Enabled' : 'Skipped'}`,
					`${emojis.custom.openfolder} **CSV Report:** ${csvAttachment ? 'Attached' : 'Not requested'}`
				],
				footer: `${emojis.custom.arrowright} Users will be prompted to run ${commandMention('alert')} after using Cadia commands.`
			})
		),
		...(csvAttachment ? { files: [csvAttachment] } : {})
	};

	return interaction.editReply(response);
}

async function previewTemplate(interaction, draft, dmUsers, exportCsv = false) {
	const componentId = `alert:${interaction.id}`;
	const payload = {
		components: buildPreviewComponents(draft, componentId, dmUsers, exportCsv),
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	};
	let message;
	if (interaction.deferred) {
		await interaction.editReply(payload);
		message = await interaction.fetchReply();
	} else if (interaction.replied) {
		const response = await interaction.followUp({ ...payload, withResponse: true });
		message = response.resource?.message ?? null;
	} else {
		const response = await interaction.reply({ ...payload, withResponse: true });
		message = response.resource?.message ?? (await interaction.fetchReply());
	}
	if (!message) return null;
	const collector = message.createMessageComponentCollector({ time: 180_000 });

	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${emojis.custom.forbidden} **Not Your Preview**`, `Run ${commandMention('alert-template')} to open your own preview.`))
			);
		}
		if (!i.customId.startsWith(componentId)) return;

		const action = i.customId.split(':').at(-1);
		if (action === 'cancel') {
			collector.stop('cancelled');
			return i.update(componentReply(notice(`${emojis.custom.warning} **Alert Cancelled**`, 'The preview was discarded.')));
		}

		if (action === 'publish') {
			collector.stop('published');
			await i.update({
				components: buildPublishStatusComponents(draft, dmUsers, 'publishing', { etaText: publishEtaText(null, dmUsers) }),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});

			let progressUpdater;
			try {
				return await publishDraft(interaction, draft, dmUsers, true, {
					exportCsv,
					onTargetsCollected: async (targetData) => {
						progressUpdater = startPublishProgressUpdates({ interaction, draft, dmUsers, targetData });
						await progressUpdater.refresh();
					},
					onProgress: (progress) => progressUpdater?.update(progress),
					onBroadcastComplete: () => progressUpdater?.stop()
				});
			} catch (error) {
				await interaction
					.editReply({
						components: buildPublishStatusComponents(draft, dmUsers, 'failed', { error }),
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					})
					.catch(() => null);
				throw error;
			} finally {
				await progressUpdater?.stop();
			}
		}

		if (action === 'edit') {
			await i.showModal(buildEditModal(`${componentId}:modal`, draft));
			const submitted = await i
				.awaitModalSubmit({
					time: 120_000,
					filter: (modal) => modal.customId === `${componentId}:modal` && modal.user.id === interaction.user.id
				})
				.catch(() => null);

			if (!submitted) return;
			Object.assign(draft, resolveDraftVariables(readModalDraft(submitted, draft), interaction.client));
			return submitted.update({
				components: buildPreviewComponents(draft, componentId, dmUsers, exportCsv),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	});

	collector.on('end', async (_, reason) => {
		if (reason === 'published' || reason === 'cancelled') return;
		await interaction
			.editReply({
				components: buildPreviewComponents(draft, componentId, dmUsers, exportCsv, true),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			})
			.catch(() => null);
	});
}

async function sendUserDms(client, alert, targetData = null, options = {}) {
	targetData ??= await collectBroadcastUserIds(client);
	const userIds = targetData.userIds;
	const stats = { sent: 0, failed: 0, total: userIds.size, sources: targetData.sources, deliveries: [] };
	const startedAt = Date.now();
	options.onProgress?.({ ...stats, processed: 0, remaining: stats.total, startedAt });

	for (const userId of userIds) {
		const user = await client.users.fetch(userId).catch(() => null);
		if (!user || user.bot) {
			stats.failed += 1;
			stats.deliveries.push(createDeliveryRecord(userId, user, targetData, 'failed', user?.bot ? 'Bot account' : 'User fetch failed'));
			reportBroadcastProgress(options.onProgress, stats, startedAt);
			continue;
		}

		let failureReason = '';
		const sent = await user.send({ components: [buildAlertPanel(alert)], flags: MessageFlags.IsComponentsV2 }).then(
			() => true,
			(error) => {
				failureReason = error?.message || 'DM delivery failed';
				return false;
			}
		);
		if (sent) stats.sent += 1;
		else stats.failed += 1;
		stats.deliveries.push(createDeliveryRecord(userId, user, targetData, sent ? 'sent' : 'failed', failureReason));
		reportBroadcastProgress(options.onProgress, stats, startedAt);
	}

	return stats;
}

function reportBroadcastProgress(onProgress, stats, startedAt) {
	if (!onProgress) return;
	const processed = stats.sent + stats.failed;
	onProgress({
		failed: stats.failed,
		processed,
		remaining: Math.max(stats.total - processed, 0),
		sent: stats.sent,
		sources: stats.sources,
		total: stats.total,
		startedAt
	});
}

async function collectBroadcastUserIds(client) {
	const userIds = new Set();
	const userGuilds = new Map();
	const sources = {
		cachedUsers: 0,
		cachedMembers: 0,
		fetchedMembers: 0,
		guildOwners: 0,
		database: 0
	};

	for (const user of client.users.cache.values()) {
		if (!user.bot && addBroadcastTarget(userIds, userGuilds, user.id)) sources.cachedUsers += 1;
	}

	for (const guild of client.guilds.cache.values()) {
		if (addBroadcastTarget(userIds, userGuilds, guild.ownerId, guild)) sources.guildOwners += 1;

		for (const member of guild.members.cache.values()) {
			if (!member.user?.bot && addBroadcastTarget(userIds, userGuilds, member.id, guild)) sources.cachedMembers += 1;
		}

		const fetchedMembers = await guild.members.fetch().catch(() => null);
		if (fetchedMembers) {
			for (const member of fetchedMembers.values()) {
				if (!member.user?.bot && addBroadcastTarget(userIds, userGuilds, member.id, guild)) sources.fetchedMembers += 1;
			}
		}
	}

	sources.database = await collectDatabaseUserIds(userIds);

	return { userIds, userGuilds, sources };
}

async function collectDatabaseUserIds(userIds) {
	const documents = (
		await Promise.all([
			safeFindAll(LevelSchema),
			safeFindAll(GlobalAlertReceiptSchema),
			safeFindAll(RpgAccessSchema),
			safeFindAll(RpgProfileSchema),
			safeFindAll(RpgTutorialSchema),
			safeFindAll(TicketSchema),
			safeFindAll(UserSettingsSchema)
		])
	).flat();

	let added = 0;
	for (const document of documents) {
		for (const key of ['userId', 'ownerId', 'claimedById', 'closedById', 'User', 'userID']) {
			if (addUserId(userIds, document?.[key])) added += 1;
		}
		for (const participantId of document?.participants || []) {
			if (addUserId(userIds, participantId)) added += 1;
		}
	}
	return added;
}

async function safeFindAll(model) {
	return model?.find ? model.find({}).catch(() => []) : [];
}

function addUserId(userIds, userId) {
	const value = String(userId || '').trim();
	if (!/^\d{17,20}$/.test(value) || userIds.has(value)) return false;
	userIds.add(value);
	return true;
}

function addBroadcastTarget(userIds, userGuilds, userId, guild = null) {
	const value = String(userId || '').trim();
	if (!/^\d{17,20}$/.test(value)) return false;
	const added = addUserId(userIds, value);
	if (guild) {
		if (!userGuilds.has(value)) userGuilds.set(value, new Map());
		userGuilds.get(value).set(guild.id, guild.name || 'Unknown Server');
	}
	return added;
}

function createDeliveryRecord(userId, user, targetData, status, failureReason = '') {
	const guilds = [...(targetData.userGuilds?.get(userId) || new Map()).entries()];
	return {
		status,
		username: user?.tag || user?.username || user?.globalName || 'Unknown',
		userId,
		serverNames: guilds.length ? guilds.map(([, name]) => name) : ['Unknown / database record'],
		serverIds: guilds.length ? guilds.map(([id]) => id) : [],
		failureReason
	};
}

function createDmReportAttachment(alert, deliveries = []) {
	const headers = ['status', 'username', 'user_id', 'server_names', 'server_ids', 'failure_reason'];
	const rows = deliveries.map((delivery) => [
		delivery.status,
		delivery.username,
		delivery.userId,
		delivery.serverNames.join(' | '),
		delivery.serverIds.join(' | '),
		delivery.failureReason
	]);
	const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
	const safeAlertId = String(alert?.alertId || Date.now()).replace(/[^a-z0-9_-]/gi, '-');
	return new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: `cadia-alert-dm-report-${safeAlertId}.csv` });
}

function csvCell(value) {
	const text = String(value ?? '');
	return `"${text.replace(/"/g, '""')}"`;
}

function formatTargetSources(sources = {}) {
	const entries = [
		['cache users', sources.cachedUsers],
		['cache members', sources.cachedMembers],
		['fetched members', sources.fetchedMembers],
		['guild owners', sources.guildOwners],
		['database', sources.database]
	].filter(([, value]) => value);
	return entries.length ? entries.map(([label, value]) => `${value} ${label}`).join(', ') : 'No target sources found';
}

function shorten(value, maxLength) {
	const text = String(value || '');
	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function buildPreviewComponents(draft, componentId, dmUsers, exportCsv = false, disabled = false) {
	const previewAlert = {
		...draft,
		developerTag: 'Preview',
		createdAt: Date.now()
	};
	const preview = buildAlertPanel(previewAlert, { viewer: true }).addActionRowComponents(
		new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId(`${componentId}:edit`).setLabel('Edit').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
			new ButtonBuilder().setCustomId(`${componentId}:publish`).setLabel('Publish').setStyle(ButtonStyle.Success).setDisabled(disabled),
			new ButtonBuilder().setCustomId(`${componentId}:cancel`).setLabel('Cancel').setStyle(ButtonStyle.Danger).setDisabled(disabled)
		)
	);

	return [
		preview,
		panel({
			accentColor: color.default,
			title: `${emojis.custom.info} **Preview Settings**`,
			sections: [
				`${emojis.custom.mail} **DM Users:** ${dmUsers ? 'Enabled' : 'Skipped'}`,
				`${emojis.custom.openfolder} **CSV Report:** ${exportCsv && dmUsers ? 'Enabled' : 'Skipped'}`,
				`${emojis.custom.settings} **Style:** ${alertStyles[draft.style]?.label ?? alertStyles.update.label}`
			]
		})
	];
}

function buildPublishStatusComponents(draft, dmUsers, status, options = {}) {
	const isPublishing = status === 'publishing';
	const isFailed = status === 'failed';
	const title = isPublishing ? 'Publishing Global Alert' : 'Alert Publish Failed';
	const statusText = isPublishing
		? 'Cadia is publishing the alert now. This message will update with the final result when it finishes.'
		: `Cadia could not publish the alert.${options.error?.message ? `\nError: \`${shorten(options.error.message, 900)}\`` : ''}`;
	const targetData = options.targetData;
	const progress = options.progress;
	const etaText = options.etaText || publishEtaText(targetData?.userIds.size ?? null, dmUsers, progress);
	const targetText = targetData
		? `${emojis.custom.community} **Targets Found:** ${targetData.userIds.size} users`
		: `${emojis.custom.community} **Targets Found:** ${dmUsers ? 'Calculating...' : 'DM broadcast skipped'}`;
	const progressText = progress
		? `${emojis.custom.mail} **Progress:** ${progress.processed}/${progress.total} processed (${progress.sent} sent, ${progress.failed} failed)`
		: null;

	return [
		buildAlertPanel(
			{
				...draft,
				developerTag: isPublishing ? 'Publishing...' : 'Publish Failed',
				createdAt: Date.now()
			},
			{ viewer: true }
		),
		panel({
			accentColor: isFailed ? color.fail : color.warning,
			title: `${isFailed ? emojis.custom.fail : emojis.custom.clock} **${title}**`,
			sections: [
				statusText,
				`${emojis.custom.mail} **DM Broadcast:** ${dmUsers ? 'Enabled' : 'Skipped'}`,
				targetText,
				progressText,
				`${emojis.custom.clock} **ETA Left:** ${etaText}`,
				`${emojis.custom.info} **Final Status:** ${isPublishing ? 'Pending' : 'Failed'}`
			].filter(Boolean)
		})
	];
}

function startPublishProgressUpdates({ interaction, draft, dmUsers, targetData, intervalMs = 30_000 }) {
	let progress = {
		failed: 0,
		processed: 0,
		remaining: targetData.userIds.size,
		sent: 0,
		startedAt: Date.now(),
		total: targetData.userIds.size
	};
	let stopped = false;
	let refreshInFlight = null;

	const refresh = () => {
		if (stopped || refreshInFlight) return refreshInFlight;
		refreshInFlight = interaction
			.editReply({
				components: buildPublishStatusComponents(draft, dmUsers, 'publishing', {
					progress,
					targetData
				}),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			})
			.catch(() => null)
			.finally(() => {
				refreshInFlight = null;
			});
		return refreshInFlight;
	};

	const timer = setInterval(refresh, intervalMs);
	timer.unref?.();

	return {
		refresh,
		update(nextProgress) {
			progress = { ...progress, ...nextProgress };
		},
		async stop() {
			stopped = true;
			clearInterval(timer);
			await refreshInFlight;
		}
	};
}

function publishEtaText(targetCount, dmUsers, progress = null) {
	if (!dmUsers) return 'No DM broadcast selected.';
	if (typeof targetCount !== 'number') return 'Calculating target count...';
	if (targetCount <= 0) return 'No DM targets found.';

	const seconds = estimateRemainingSeconds(targetCount, progress);
	if (seconds <= 0) return 'Finishing now...';
	const finishAt = Math.floor((Date.now() + seconds * 1000) / 1000);
	return `about ${formatDuration(seconds)} (finishes <t:${finishAt}:R>)`;
}

function estimateRemainingSeconds(targetCount, progress) {
	const processed = Number(progress?.processed) || 0;
	const startedAt = Number(progress?.startedAt) || 0;
	if (processed > 0 && startedAt > 0) {
		const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 1);
		const usersPerSecond = processed / elapsedSeconds;
		const remaining = Math.max(targetCount - processed, 0);
		return Math.ceil(remaining / usersPerSecond);
	}
	return estimatePublishSeconds(targetCount);
}

function estimatePublishSeconds(targetCount) {
	return Math.max(5, Math.ceil(targetCount * 1.5 + 4));
}

function formatDuration(seconds) {
	if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
	const minutes = Math.ceil(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours} hour${hours === 1 ? '' : 's'}${remainingMinutes ? ` ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : ''}`;
}

function buildEditModal(customId, draft) {
	const titleInput = new TextInputBuilder()
		.setCustomId('title')
		.setLabel('Title')
		.setStyle(TextInputStyle.Short)
		.setMaxLength(120)
		.setRequired(false);
	const messageInput = new TextInputBuilder()
		.setCustomId('message')
		.setLabel('Message, supports -# subtext')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(1800)
		.setRequired(true);
	const footerInput = new TextInputBuilder()
		.setCustomId('footer')
		.setLabel('Footer')
		.setStyle(TextInputStyle.Short)
		.setMaxLength(300)
		.setRequired(false);
	const thumbnailInput = new TextInputBuilder()
		.setCustomId('thumbnail')
		.setLabel('Thumbnail URL')
		.setStyle(TextInputStyle.Short)
		.setMaxLength(500)
		.setRequired(false);

	if (draft.title) titleInput.setValue(draft.title);
	if (draft.message) messageInput.setValue(draft.message);
	if (draft.footer) footerInput.setValue(draft.footer);
	if (draft.thumbnail) thumbnailInput.setValue(draft.thumbnail);

	return new ModalBuilder()
		.setCustomId(customId)
		.setTitle('Edit Cadia Alert')
		.addComponents(
			new ActionRowBuilder().addComponents(titleInput),
			new ActionRowBuilder().addComponents(messageInput),
			new ActionRowBuilder().addComponents(footerInput),
			new ActionRowBuilder().addComponents(thumbnailInput)
		);
}

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
	addDraftOptions,
	addTemplateOption,
	applyTemplate,
	buildPublishStatusComponents,
	createDmReportAttachment,
	estimateRemainingSeconds,
	normalizeAlertMessage,
	publishEtaText,
	publishDraft,
	readDraft,
	resolveDraftVariables,
	previewTemplate,
	sendUserDms,
	startPublishProgressUpdates
};
