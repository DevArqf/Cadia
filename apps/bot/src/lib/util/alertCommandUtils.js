const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} = require('discord.js');
const { channels, color, emojis } = require('../../config');
const { alertStyles, alertTemplates, buildAlertPanel, componentReply, publishAlert, updateAlertDmStats } = require('./globalAlerts');
const { collectBroadcastUserIds, createDmReportAttachment, formatTargetSources, sendAlertToChannel, sendUserDms } = require('./alertBroadcast');
const {
	DEFAULT_ALERT_FOOTER,
	applyTemplate,
	normalizeAlertMessage,
	readDraft,
	readModalDraft,
	resolveDraftVariables
} = require('./alertDrafts');
const { commandMention } = require('./commandMentions');
const { notice, panel } = require('./components');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../runtime/interactionSessions');

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
	const channelMessage = await sendAlertToChannel(interaction.client, alert);
	alert.channelId = channelMessage.channelId || channels.globalAlerts;
	alert.channelMessageId = channelMessage.id;
	alert.updatedAt = Date.now();
	await alert.save();
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
					`${emojis.custom.news} **Channel Copy:** <#${alert.channelId}>`,
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
	await saveInteractionSession({
		kind: 'alert',
		sessionId: interaction.id,
		ownerId: interaction.user.id,
		guildId: interaction.guildId || interaction.guild?.id || null,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message.id,
		state: { draft, dmUsers, exportCsv },
		ttlMs: 180_000
	});
}

async function handleAlertInteraction(interaction) {
	if (!interaction.customId?.startsWith('alert:')) return false;
	const [, sessionId, action] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	if (!session) {
		await interaction.reply(componentReply(notice(`${emojis.custom.warning} **Preview Expired**`, 'Open a new alert preview and try again.')));
		return true;
	}
	if (interaction.user.id !== session.ownerId) {
		await interaction.reply(
			componentReply(notice(`${emojis.custom.forbidden} **Not Your Preview**`, `Run ${commandMention('alert-template')} to open your own preview.`))
		);
		return true;
	}

	const draft = session.state?.draft || {};
	const dmUsers = Boolean(session.state?.dmUsers);
	const exportCsv = Boolean(session.state?.exportCsv);
	const componentId = `alert:${session.sessionId}`;

	if (interaction.isModalSubmit?.() && action === 'modal') {
		const nextDraft = resolveDraftVariables(readModalDraft(interaction, draft), interaction.client);
		await updateInteractionSession(session.sessionId, {
			kind: 'alert',
			ownerId: session.ownerId,
			guildId: interaction.guildId || interaction.guild?.id || session.guildId || null,
			channelId: interaction.channelId || interaction.channel?.id || session.channelId || null,
			messageId: interaction.message?.id || session.messageId || null,
			state: { draft: nextDraft, dmUsers, exportCsv },
			ttlMs: 180_000
		});
		await interaction.update({
			components: buildPreviewComponents(nextDraft, componentId, dmUsers, exportCsv),
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
		return true;
	}

	if (action === 'cancel') {
		await interaction.update(componentReply(notice(`${emojis.custom.warning} **Alert Cancelled**`, 'The preview was discarded.')));
		return true;
	}

	if (action === 'edit') {
		await interaction.showModal(buildEditModal(`${componentId}:modal`, draft));
		return true;
	}

	if (action === 'publish') {
		await interaction.update({
			components: buildPublishStatusComponents(draft, dmUsers, 'publishing', { etaText: publishEtaText(null, dmUsers) }),
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});

		let progressUpdater;
		try {
			await publishDraft(interaction, draft, dmUsers, true, {
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
		return true;
	}

	return false;
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

module.exports = {
	DEFAULT_ALERT_FOOTER,
	addDraftOptions,
	addTemplateOption,
	applyTemplate,
	buildPublishStatusComponents,
	createDmReportAttachment,
	estimateRemainingSeconds,
	handleAlertInteraction,
	normalizeAlertMessage,
	publishEtaText,
	publishDraft,
	readDraft,
	resolveDraftVariables,
	previewTemplate,
	sendUserDms,
	startPublishProgressUpdates
};
