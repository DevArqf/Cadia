const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { color, emojis } = require('../../config');
const { alertStyles, alertTemplates, buildAlertPanel, componentReply, publishAlert, updateAlertDmStats } = require('./globalAlerts');
const { notice, panel } = require('./components');

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
		.addBooleanOption((option) =>
			option.setName('dm-users').setDescription('Also DM every unique non-bot user Cadia can see').setRequired(false)
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

async function publishDraft(interaction, draft, dmUsers, fromPreview = false) {
	if (!fromPreview) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const alert = await publishAlert({ ...draft, developer: interaction.user, dmEnabled: dmUsers });
	const stats = dmUsers ? await sendUserDms(interaction.client, alert) : { sent: 0, failed: 0, total: 0 };
	await updateAlertDmStats(alert, stats);

	const response = componentReply(
		panel({
			accentColor: color.success,
			title: `${emojis.custom.success} **Global Alert Published**`,
			subtitle: dmUsers ? 'User DM broadcast complete' : 'DM broadcast skipped',
			sections: [
				`${emojis.custom.info} **Alert ID:** \`${alert.alertId}\``,
				`${emojis.custom.mail} **User DMs Sent:** ${stats.sent}`,
				`${emojis.custom.warning} **User DMs Failed:** ${stats.failed}`,
				`${emojis.custom.community} **Unique Users Targeted:** ${stats.total}`,
				`${emojis.custom.info} **DM Broadcast:** ${dmUsers ? 'Enabled' : 'Skipped'}`
			],
			footer: `${emojis.custom.arrowright} Users will be prompted to run /alert after using Cadia commands.`
		})
	);

	return interaction.editReply(response);
}

async function previewTemplate(interaction, draft, dmUsers) {
	const componentId = `alert:${interaction.id}`;
	const payload = {
		components: buildPreviewComponents(draft, componentId, dmUsers),
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
				componentReply(notice(`${emojis.custom.forbidden} **Not Your Preview**`, 'Run `/alert-template` to open your own preview.'))
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
			await i.deferUpdate();
			return publishDraft(interaction, draft, dmUsers, true);
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
				components: buildPreviewComponents(draft, componentId, dmUsers),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	});

	collector.on('end', async (_, reason) => {
		if (reason === 'published' || reason === 'cancelled') return;
		await interaction
			.editReply({
				components: buildPreviewComponents(draft, componentId, dmUsers, true),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			})
			.catch(() => null);
	});
}

async function sendUserDms(client, alert) {
	const userIds = await collectBroadcastUserIds(client);
	const stats = { sent: 0, failed: 0, total: userIds.size };

	for (const userId of userIds) {
		const user = await client.users.fetch(userId).catch(() => null);
		if (!user || user.bot) {
			stats.failed += 1;
			continue;
		}

		const sent = await user.send({ components: [buildAlertPanel(alert)], flags: MessageFlags.IsComponentsV2 }).then(
			() => true,
			() => false
		);
		if (sent) stats.sent += 1;
		else stats.failed += 1;
	}

	return stats;
}

async function collectBroadcastUserIds(client) {
	const userIds = new Set();

	for (const guild of client.guilds.cache.values()) {
		const members = await guild.members.fetch().catch(() => guild.members.cache);
		for (const member of members.values()) {
			if (!member.user?.bot) userIds.add(member.id);
		}
	}

	return userIds;
}

function buildPreviewComponents(draft, componentId, dmUsers, disabled = false) {
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
				`${emojis.custom.settings} **Style:** ${alertStyles[draft.style]?.label ?? alertStyles.update.label}`
			]
		})
	];
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
		footer: normalizeOptional(interaction.options.getString('footer')),
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

	return value.replace(/\{botIcon\}/gi, botIcon).replace(/\{emoji\.([a-z0-9_]+)\}/gi, (_, key) => {
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
	addDraftOptions,
	addTemplateOption,
	applyTemplate,
	normalizeAlertMessage,
	publishDraft,
	readDraft,
	resolveDraftVariables,
	previewTemplate
};
