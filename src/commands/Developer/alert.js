const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const {
	alertStyles,
	alertTemplates,
	buildAlertPanel,
	buildNoAlertPanel,
	clearActiveAlert,
	componentReply,
	getAlertById,
	getAlertHistory,
	getActiveAlert,
	isDeveloper,
	markAlertViewed,
	publishAlert,
	updateAlertDmStats
} = require('../../lib/util/globalAlerts');
const { notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'View or publish a Cadia global alert'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('alert')
				.setDescription(this.description)
				.addStringOption((option) =>
					option.setName('message').setDescription('Developer only: publish a new global alert').setMaxLength(1800).setRequired(false)
				)
				.addStringOption((option) =>
					option.setName('title').setDescription('Developer only: custom alert title').setMaxLength(120).setRequired(false)
				)
				.addStringOption((option) =>
					option.setName('footer').setDescription('Developer only: custom alert footer').setMaxLength(300).setRequired(false)
				)
				.addStringOption((option) =>
					option.setName('thumbnail').setDescription('Developer only: HTTPS thumbnail URL').setMaxLength(500).setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('style')
						.setDescription('Developer only: alert visual style')
						.setRequired(false)
						.addChoices(...Object.entries(alertStyles).map(([value, style]) => ({ name: style.label, value })))
				)
				.addStringOption((option) =>
					option
						.setName('template')
						.setDescription('Developer only: preview a premade alert template')
						.setRequired(false)
						.addChoices(...Object.entries(alertTemplates).map(([value, template]) => ({ name: template.label, value })))
				)
				.addStringOption((option) =>
					option.setName('alert-id').setDescription('Developer only: preview a past alert by ID').setMaxLength(80).setRequired(false)
				)
				.addBooleanOption((option) =>
					option.setName('clear').setDescription('Developer only: clear the active global alert').setRequired(false)
				)
				.addBooleanOption((option) => option.setName('history').setDescription('Developer only: list recent alert IDs').setRequired(false))
				.addBooleanOption((option) =>
					option.setName('dm-users').setDescription('Developer only: also DM every unique non-bot user Cadia can see').setRequired(false)
				)
		);
	}

	async chatInputRun(interaction) {
		const draft = resolveDraftVariables(readDraft(interaction), interaction.client);
		const clear = interaction.options.getBoolean('clear') ?? false;
		const history = interaction.options.getBoolean('history') ?? false;
		const dmUsers = interaction.options.getBoolean('dm-users') ?? false;
		const templateKey = interaction.options.getString('template');
		const alertId = interaction.options.getString('alert-id');
		const developerAction = Boolean(
			draft.message || draft.title || draft.footer || draft.thumbnail || draft.style || templateKey || alertId || clear || history || dmUsers
		);

		if (developerAction && !isDeveloper(interaction.user.id)) {
			return interaction.reply(
				componentReply(notice(`${emojis.custom.forbidden} **Developer Only**`, 'Only Cadia developers can publish or clear global alerts.'))
			);
		}

		if (clear) return this.clearAlert(interaction);
		if (history) return this.showHistory(interaction);
		if (alertId) return this.showPastAlert(interaction, alertId);
		if (draft.message === '') {
			return interaction.reply(componentReply(notice(`${emojis.custom.warning} **Empty Alert**`, 'The alert message cannot be empty.')));
		}

		if (templateKey) return this.previewTemplate(interaction, applyTemplate(templateKey, draft), dmUsers);
		if (draft.message) return this.publishDraft(interaction, draft, dmUsers);

		const alert = await getActiveAlert({ fresh: true });
		if (alert) await markAlertViewed(alert, interaction.user.id);
		return interaction.reply(componentReply(alert ? buildAlertPanel(alert, { viewer: true }) : buildNoAlertPanel()));
	}

	async showHistory(interaction) {
		const alerts = await getAlertHistory(12);
		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.default,
					title: `${emojis.custom.openfolder} **Alert History**`,
					subtitle: 'Recent Cadia global alerts',
					sections: [formatAlertHistory(alerts)],
					footer: `${emojis.custom.arrowright} Use /alert alert-id:<id> to preview a past alert.`
				})
			)
		);
	}

	async showPastAlert(interaction, alertId) {
		const alert = await getAlertById(alertId.trim());
		if (!alert) {
			return interaction.reply(
				componentReply(notice(`${emojis.custom.warning} **Alert Not Found**`, `No alert exists with ID \`${alertId.trim()}\`.`))
			);
		}

		return interaction.reply({
			components: [
				buildAlertPanel(alert, { viewer: true, showId: true }),
				panel({
					accentColor: color.default,
					title: `${emojis.custom.info} **Past Alert Preview**`,
					sections: [
						`${emojis.custom.settings} **Status:** ${alert.active ? 'Active' : 'Archived'}`,
						`${emojis.custom.mail} **DM Stats:** ${alert.dmSent ?? 0} sent, ${alert.dmFailed ?? 0} failed, ${alert.dmTargeted ?? 0} targeted`
					]
				})
			],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}

	async previewTemplate(interaction, draft, dmUsers) {
		const componentId = `alert:${interaction.id}`;
		const response = await interaction.reply({
			components: buildPreviewComponents(draft, componentId, dmUsers),
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			withResponse: true
		});
		const message = response.resource?.message ?? (await interaction.fetchReply());
		const collector = message.createMessageComponentCollector({ time: 180_000 });

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				return i.reply(
					componentReply(notice(`${emojis.custom.forbidden} **Not Your Preview**`, 'Run `/alert` to open your own preview.'), true)
				);
			}
			if (!i.customId.startsWith(componentId)) return;

			const action = i.customId.split(':').at(-1);
			if (action === 'cancel') {
				collector.stop('cancelled');
				return i.update(componentReply(notice(`${emojis.custom.warning} **Alert Cancelled**`, 'The preview was discarded.'), true));
			}

			if (action === 'publish') {
				collector.stop('published');
				await i.deferUpdate();
				return this.publishDraft(interaction, draft, dmUsers, true);
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

	async publishDraft(interaction, draft, dmUsers, fromPreview = false) {
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

		return fromPreview ? interaction.editReply(response) : interaction.editReply(response);
	}

	async clearAlert(interaction) {
		const alert = await clearActiveAlert(interaction.user);
		return interaction.reply(
			componentReply(
				alert
					? panel({
							accentColor: color.success,
							title: `${emojis.custom.success} **Global Alert Cleared**`,
							sections: [`${emojis.custom.arrowright} Users will no longer receive alert prompts.`]
						})
					: buildNoAlertPanel()
			)
		);
	}
}

function formatAlertHistory(alerts) {
	if (!alerts.length) return `${emojis.custom.warning} No alerts have been published yet.`;

	return alerts
		.map((alert, index) => {
			const title = alert.title || 'Cadia Global Alert';
			const status = alert.active ? 'Active' : 'Archived';
			const published = alert.createdAt ? `<t:${Math.floor(alert.createdAt / 1000)}:R>` : 'Unknown';
			return [
				`**${index + 1}. ${title}**`,
				`${emojis.custom.info} ID: \`${alert.alertId}\``,
				`${emojis.custom.settings} ${status} | ${published}`
			].join('\n');
		})
		.join('\n\n');
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
		.setLabel('Message')
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

function normalizeAlertMessage(message) {
	if (message === null || message === undefined) return message;
	return message.replace(/\\n/g, '\n').trim();
}

function normalizeOptional(value) {
	if (value === null || value === undefined) return null;
	const normalized = value.replace(/\\n/g, '\n').trim();
	return normalized || null;
}

module.exports = {
	UserCommand
};
