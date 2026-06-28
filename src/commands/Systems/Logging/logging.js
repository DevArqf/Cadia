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
const { commandMention } = require('../../../lib/util/commandMentions');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../../lib/runtime/interactionSessions');
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
		await saveInteractionSession({
			kind: 'logging',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guild.id,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: message?.id || null,
			state
		});
	}
}

async function handleLoggingInteraction(interaction) {
	if (!interaction.customId?.startsWith('logging:')) return false;
	const [, sessionId] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;

	if (interaction.user.id !== ownerId) {
		return interaction.reply({
			components: [buildNotice(`${emojis.custom.forbidden} **Not Your Panel**`, `Run ${commandMention('logging')} to open your own audit panel.`)],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}

	const guildId = interaction.guildId || interaction.guild?.id || session?.guildId;
	if (!guildId) {
		return interaction.reply({
			components: [buildNotice(`${emojis.custom.fail} **Missing Server**`, 'I could not identify the server for this logging panel.')],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}

	const componentId = `logging:${session?.sessionId || sessionId}`;
	const state = {
		category: session?.state?.category || 'messages',
		channelTarget: session?.state?.channelTarget || 'default'
	};
	let nextConfig = await getAuditConfig(guildId);
	const action = interaction.customId.split(':').at(-1);

	if (action === 'enable') nextConfig = await updateAuditConfig(guildId, { enabled: true });
	if (action === 'disable') nextConfig = await updateAuditConfig(guildId, { enabled: false });
	if (action === 'channel') {
		const channelId = interaction.values[0];
		if (state.channelTarget === 'default') nextConfig = await updateAuditConfig(guildId, { channelId });
		else nextConfig = await updateAuditConfig(guildId, { channelIds: { [state.channelTarget]: channelId } });
	}
	if (action === 'clearChannel') {
		if (state.channelTarget === 'default') nextConfig = await updateAuditConfig(guildId, { channelId: null });
		else nextConfig = await updateAuditConfig(guildId, { channelIds: { [state.channelTarget]: null } });
	}
	if (action === 'clearAllChannels') nextConfig = await updateAuditConfig(guildId, { channelId: null, channelIds: {} });
	if (action === 'category') {
		state.category = interaction.values[0];
		state.channelTarget = 'default';
	}
	if (action === 'channelTarget') state.channelTarget = interaction.values[0];
	if (action === 'actions') {
		for (const eventKey of interaction.values) nextConfig = await toggleAuditEvent(guildId, eventKey);
	}

	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'logging',
		ownerId,
		guildId,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state
	});

	await interaction.update({
		components: [buildLoggingPanel(interaction, nextConfig, componentId, state.category, state.channelTarget)],
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	});
	return true;
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
	UserCommand,
	buildLoggingPanel,
	handleLoggingInteraction
};
