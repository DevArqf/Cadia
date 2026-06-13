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
const {
	auditActions,
	auditCategories,
	getAuditConfig,
	resolveAuditChannelId,
	toggleAuditEvent,
	updateAuditConfig
} = require('../../../lib/util/auditLogger');

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
		const state = { category: 'messages', channelTarget: 'default' };
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
			if (action === 'channel') {
				const channelId = i.values[0];
				if (state.channelTarget === 'default') {
					nextConfig = await updateAuditConfig(interaction.guild.id, { channelId });
				} else {
					nextConfig = await updateAuditConfig(interaction.guild.id, { channelIds: { [state.channelTarget]: channelId } });
				}
			}
			if (action === 'clearChannel') {
				if (state.channelTarget === 'default') {
					nextConfig = await updateAuditConfig(interaction.guild.id, { channelId: null });
				} else {
					nextConfig = await updateAuditConfig(interaction.guild.id, { channelIds: { [state.channelTarget]: null } });
				}
			}
			if (action === 'clearAllChannels') nextConfig = await updateAuditConfig(interaction.guild.id, { channelId: null, channelIds: {} });
			if (action === 'category') {
				state.category = i.values[0];
				state.channelTarget = 'default';
			}
			if (action === 'channelTarget') state.channelTarget = i.values[0];
			if (action === 'actions') {
				for (const eventKey of i.values) nextConfig = await toggleAuditEvent(interaction.guild.id, eventKey);
			}

			await i.update({
				components: [buildLoggingPanel(interaction, nextConfig, componentId, state.category, state.channelTarget)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		});

		collector.on('end', async () => {
			const latestConfig = await getAuditConfig(interaction.guild.id).catch(() => config);
			await interaction
				.editReply({
					components: [buildLoggingPanel(interaction, latestConfig, componentId, state.category, state.channelTarget, true)],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				})
				.catch(() => null);
		});
	}
}

function buildLoggingPanel(interaction, config, componentId, selectedCategory = 'messages', channelTarget = 'default', disabled = false) {
	const actionEntries = Object.entries(auditActions);
	const enabledCount = actionEntries.filter(([key]) => config.events?.[key]).length;
	const channel = config.channelId ? `<#${config.channelId}>` : 'No channel selected';
	const category = auditCategories[selectedCategory] ? selectedCategory : 'messages';
	const selectedActions = actionEntries.filter(([, action]) => action.category === category);
	const target = channelTarget === 'default' || auditActions[channelTarget]?.category === category ? channelTarget : 'default';
	const targetChannelId = target === 'default' ? config.channelId : resolveAuditChannelId(config, target);
	const targetLabel = target === 'default' ? 'Default fallback' : auditActions[target].label;
	const targetChannel = targetChannelId ? `<#${targetChannelId}>` : 'No channel selected';
	const dedicatedCount = Object.keys(config.channelIds || {}).length;
	const hasSelectedChannel = target === 'default' ? Boolean(config.channelId) : Boolean(config.channelIds?.[target]);
	const hasAnyChannel = Boolean(config.channelId) || dedicatedCount > 0;

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
					`${emojis.custom.openfolder} **Default Channel:** ${channel}`,
					`${emojis.custom.openfolder} **Editing Channel For:** ${targetLabel} -> ${targetChannel}`,
					`${emojis.custom.info} **Enabled Audits:** ${enabledCount}/${actionEntries.length}`,
					`${emojis.custom.settings} **Dedicated Channels:** ${dedicatedCount}`,
					`${emojis.custom.settings} **Editing:** ${auditCategories[category].label}`,
					`-# Dedicated audit channels override the default channel for that audit. The bot needs permission to view and send messages there.`
				].join('\n')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatEventSummary(config, category)))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId(`${componentId}:channel`)
					.setPlaceholder(`Choose channel for ${targetLabel}`)
					.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
					.setDisabled(disabled)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${componentId}:channelTarget`)
					.setPlaceholder('Choose audit destination to edit')
					.setMinValues(1)
					.setMaxValues(1)
					.setDisabled(disabled)
					.addOptions([
						new StringSelectMenuOptionBuilder()
							.setLabel('Default fallback')
							.setDescription('Used when an audit has no dedicated channel.')
							.setValue('default')
							.setDefault(target === 'default'),
						...selectedActions.map(([key, action]) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(action.label)
								.setDescription(formatChannelTargetDescription(config, key))
								.setValue(key)
								.setDefault(target === key)
						)
					])
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
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId(`${componentId}:clearChannel`)
					.setLabel('Clear Selected Channel')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || !hasSelectedChannel),
				new ButtonBuilder()
					.setCustomId(`${componentId}:clearAllChannels`)
					.setLabel('Clear All Channels')
					.setStyle(ButtonStyle.Danger)
					.setDisabled(disabled || !hasAnyChannel)
			)
		);
}

function formatChannelTargetDescription(config, eventKey) {
	const dedicatedChannelId = config.channelIds?.[eventKey];
	if (dedicatedChannelId) return `Dedicated channel: #${dedicatedChannelId}`;
	if (config.channelId) return `Uses default channel: #${config.channelId}`;
	return 'No destination channel selected yet.';
}

function formatEventSummary(config, category) {
	const categoryRows = Object.entries(auditActions)
		.filter(([, action]) => action.category === category)
		.map(([key, action]) => {
			const channelId = config.channelIds?.[key];
			const destination = channelId ? ` -> <#${channelId}>` : config.channelId ? ' -> default' : '';
			return `${config.events?.[key] ? emojis.custom.success : emojis.custom.fail} **${action.label}:** ${action.description}${destination}`;
		});
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
