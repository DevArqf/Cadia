const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder
} = require('discord.js');
const { auditActions, auditCategories, getAuditConfig, toggleAuditEvent, updateAuditConfig } = require('../../../lib/util/auditLogger');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Administrator,
			description: 'Open the server audit logging control panel'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('logging').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		const componentId = `logging:${interaction.id}`;
		const state = { category: 'messages' };
		const config = await getAuditConfig(interaction.guild.id);
		const response = await interaction.reply({
			components: [buildLoggingPanel(interaction, config, componentId, state.category)],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			withResponse: true
		});
		const message = response.resource?.message ?? (await interaction.fetchReply());
		const collector = message.createMessageComponentCollector({ time: 180_000 });

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				return i.reply({
					components: [buildNotice(`${emojis.custom.forbidden} **Not Your Panel**`, 'Run `/logging` to open your own audit panel.')],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				});
			}

			if (!i.customId.startsWith(componentId)) return;

			let nextConfig = await getAuditConfig(interaction.guild.id);
			const action = i.customId.split(':').at(-1);

			if (action === 'enable') nextConfig = await updateAuditConfig(interaction.guild.id, { enabled: true });
			if (action === 'disable') nextConfig = await updateAuditConfig(interaction.guild.id, { enabled: false });
			if (action === 'channel') nextConfig = await updateAuditConfig(interaction.guild.id, { channelId: i.values[0] });
			if (action === 'category') state.category = i.values[0];
			if (action === 'actions') {
				for (const eventKey of i.values) nextConfig = await toggleAuditEvent(interaction.guild.id, eventKey);
			}

			await i.update({
				components: [buildLoggingPanel(interaction, nextConfig, componentId, state.category)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		});

		collector.on('end', async () => {
			const latestConfig = await getAuditConfig(interaction.guild.id).catch(() => config);
			await interaction
				.editReply({
					components: [buildLoggingPanel(interaction, latestConfig, componentId, state.category, true)],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				})
				.catch(() => null);
		});
	}
}

function buildLoggingPanel(interaction, config, componentId, selectedCategory = 'messages', disabled = false) {
	const actionEntries = Object.entries(auditActions);
	const enabledCount = actionEntries.filter(([key]) => config.events?.[key]).length;
	const channel = config.channelId ? `<#${config.channelId}>` : 'No channel selected';
	const category = auditCategories[selectedCategory] ? selectedCategory : 'messages';
	const selectedActions = actionEntries.filter(([, action]) => action.category === category);

	return new ContainerBuilder()
		.setAccentColor(Number.parseInt((config.enabled ? color.success : color.warning).replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.settings} **Audit Logging Panel**\n` + `Server administrators can decide exactly what Cadia logs for this server.`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`${config.enabled ? emojis.custom.success : emojis.custom.warning} **Status:** ${config.enabled ? 'Enabled' : 'Disabled'}`,
					`${emojis.custom.openfolder} **Log Channel:** ${channel}`,
					`${emojis.custom.info} **Enabled Audits:** ${enabledCount}/${actionEntries.length}`,
					`${emojis.custom.settings} **Editing:** ${auditCategories[category].label}`,
					`-# The bot needs permission to view and send messages in the selected channel.`
				].join('\n')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatEventSummary(config, category)))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId(`${componentId}:channel`)
					.setPlaceholder('Choose audit log channel')
					.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
					.setDisabled(disabled)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${componentId}:category`)
					.setPlaceholder('Choose audit category')
					.setMinValues(1)
					.setMaxValues(1)
					.setDisabled(disabled)
					.addOptions(
						Object.entries(auditCategories).map(([key, group]) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(group.label)
								.setDescription(group.description)
								.setValue(key)
								.setDefault(key === category)
						)
					)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${componentId}:actions`)
					.setPlaceholder(`Toggle ${auditCategories[category].label.toLowerCase()} audits`)
					.setMinValues(1)
					.setMaxValues(selectedActions.length)
					.setDisabled(disabled)
					.addOptions(
						selectedActions.map(([key, action]) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(`${config.events?.[key] ? 'On' : 'Off'} - ${action.label}`)
								.setDescription(action.description)
								.setValue(key)
						)
					)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`${componentId}:enable`)
					.setLabel('Enable Logging')
					.setStyle(ButtonStyle.Success)
					.setDisabled(disabled || config.enabled),
				new ButtonBuilder()
					.setCustomId(`${componentId}:disable`)
					.setLabel('Disable Logging')
					.setStyle(ButtonStyle.Danger)
					.setDisabled(disabled || !config.enabled)
			)
		);
}

function formatEventSummary(config, category) {
	const categoryRows = Object.entries(auditActions)
		.filter(([, action]) => action.category === category)
		.map(([key, action]) => `${config.events?.[key] ? emojis.custom.success : emojis.custom.fail} **${action.label}:** ${action.description}`);
	const categorySummary = Object.entries(auditCategories)
		.map(([key, group]) => {
			const actions = Object.entries(auditActions).filter(([, action]) => action.category === key);
			const enabled = actions.filter(([actionKey]) => config.events?.[actionKey]).length;
			return `${group.label}: ${enabled}/${actions.length}`;
		})
		.join('  |  ');

	return `${categoryRows.join('\n')}\n\n-# ${categorySummary}`;
}

function buildNotice(title, message) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title}\n${message}`));
}

module.exports = {
	UserCommand
};
