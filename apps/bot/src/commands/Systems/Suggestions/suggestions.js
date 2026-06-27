const { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { color, emojis } = require('../../../config');
const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const SuggestionConfig = require('../../../lib/schemas/suggestionConfigSchema');
const Suggestion = require('../../../lib/schemas/suggestionSchema');
const { buildSuggestionPanel } = require('../../../lib/suggestions/suggestionSystem');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Administrator,
			description: 'Configure and manage the suggestion system'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('suggestions')
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('setup')
						.setDescription('Set up the suggestion panel')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('Channel where suggestions will be submitted')
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('style')
								.setDescription('Panel appearance')
								.addChoices({ name: 'Embed', value: 'embed' }, { name: 'Message', value: 'message' })
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) => subcommand.setName('resend-panel').setDescription('Replace the saved suggestion panel'))
				.addSubcommand((subcommand) => subcommand.setName('status').setDescription('View suggestion system status'))
				.addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Disable suggestions and remove the panel'))
		);
	}

	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'setup') return setupSuggestions(interaction);
		if (subcommand === 'resend-panel') return resendSuggestionPanel(interaction);
		if (subcommand === 'status') return showSuggestionStatus(interaction);
		if (subcommand === 'disable') return disableSuggestions(interaction);
	}
}

async function setupSuggestions(interaction) {
	const channel = interaction.options.getChannel('channel', true);
	const style = interaction.options.getString('style', true);
	const permissionError = getChannelPermissionError(channel, interaction.guild.members.me);
	if (permissionError) return interaction.reply({ content: permissionError, flags: MessageFlags.Ephemeral });

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const oldConfig = await SuggestionConfig.findOne({ guildId: interaction.guildId });
	const panel = await channel.send(buildSuggestionPanel({ ...(oldConfig || {}), style }));

	try {
		await SuggestionConfig.findOneAndUpdate(
			{ guildId: interaction.guildId },
			{
				guildId: interaction.guildId,
				channelId: channel.id,
				panelMessageId: panel.id,
				style,
				enabled: true,
				updatedAt: Date.now()
			},
			{ upsert: true }
		);
	} catch (error) {
		await panel.delete().catch(() => null);
		throw error;
	}

	if (oldConfig?.panelMessageId && oldConfig.panelMessageId !== panel.id) await deleteStoredPanel(interaction.guild, oldConfig);
	return interaction.editReply(`${emojis.custom.success} Suggestions are now enabled in ${channel} using **${style}** styling.`);
}

async function resendSuggestionPanel(interaction) {
	const config = await SuggestionConfig.findOne({ guildId: interaction.guildId });
	if (!config?.enabled || !config.channelId) {
		return interaction.reply({ content: 'Set up the suggestion system before resending its panel.', flags: MessageFlags.Ephemeral });
	}

	const channel = interaction.guild.channels.cache.get(config.channelId) || (await interaction.guild.channels.fetch(config.channelId).catch(() => null));
	if (!channel?.isTextBased()) {
		return interaction.reply({ content: 'The configured suggestion channel no longer exists.', flags: MessageFlags.Ephemeral });
	}
	const permissionError = getChannelPermissionError(channel, interaction.guild.members.me);
	if (permissionError) return interaction.reply({ content: permissionError, flags: MessageFlags.Ephemeral });

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const oldPanelMessageId = config.panelMessageId;
	const panel = await channel.send(buildSuggestionPanel(config));
	config.panelMessageId = panel.id;
	config.updatedAt = Date.now();
	try {
		await config.save();
	} catch (error) {
		await panel.delete().catch(() => null);
		throw error;
	}
	if (oldPanelMessageId && oldPanelMessageId !== panel.id) {
		await deleteStoredPanel(interaction.guild, { channelId: config.channelId, panelMessageId: oldPanelMessageId });
	}

	return interaction.editReply(`${emojis.custom.success} The suggestion panel was replaced in ${channel}.`);
}

async function showSuggestionStatus(interaction) {
	const config = await SuggestionConfig.findOne({ guildId: interaction.guildId });
	const suggestions = await Suggestion.find({ guildId: interaction.guildId });
	const openCount = suggestions.filter((suggestion) => suggestion.status === 'open').length;
	const embed = new EmbedBuilder()
		.setColor(config?.enabled ? color.success : color.warning)
		.setTitle('Suggestion System Status')
		.setDescription(
			[
				`${config?.enabled ? emojis.custom.success : emojis.custom.warning} **Status:** ${config?.enabled ? 'Enabled' : 'Disabled'}`,
				`${emojis.custom.comment} **Channel:** ${config?.channelId ? `<#${config.channelId}>` : 'Not configured'}`,
				`${emojis.custom.pencil} **Panel Style:** ${config?.style || 'Not configured'}`,
				`${emojis.custom.info} **Suggestions:** ${suggestions.length} total, ${openCount} open`
			].join('\n')
		)
		.setTimestamp();

	return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function disableSuggestions(interaction) {
	const config = await SuggestionConfig.findOne({ guildId: interaction.guildId });
	if (!config) return interaction.reply({ content: 'The suggestion system has not been configured.', flags: MessageFlags.Ephemeral });

	await deleteStoredPanel(interaction.guild, config);
	config.enabled = false;
	config.panelMessageId = null;
	config.updatedAt = Date.now();
	await config.save();
	return interaction.reply({ content: `${emojis.custom.success} The suggestion system has been disabled.`, flags: MessageFlags.Ephemeral });
}

function getChannelPermissionError(channel, botMember) {
	const permissions = channel.permissionsFor(botMember);
	const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];
	if (permissions?.has(required)) return null;
	return `I need **View Channel**, **Send Messages**, and **Embed Links** in ${channel}.`;
}

async function deleteStoredPanel(guild, config) {
	if (!config?.channelId || !config?.panelMessageId) return;
	const channel = guild.channels.cache.get(config.channelId) || (await guild.channels.fetch(config.channelId).catch(() => null));
	if (!channel?.messages) return;
	const message = await channel.messages.fetch(config.panelMessageId).catch(() => null);
	await message?.delete().catch(() => null);
}

module.exports = {
	UserCommand,
	getChannelPermissionError
};
