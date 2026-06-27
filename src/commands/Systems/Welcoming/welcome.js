const { ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { color, emojis } = require('../../../config');
const { WelcomeSchema } = require('../../../lib/schemas/welcomeSchema');
const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { commandMention } = require('../../../lib/util/commandMentions');
const { getWelcomeTemplate, listWelcomeTemplates, renderWelcomePreview } = require('../../../lib/util/welcomeTemplates');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			name: 'welcome',
			description: 'Configure the server welcome system',
			permissionLevel: PermissionLevels.Administrator,
			requiredUserPermissions: ['ManageGuild']
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('setup')
						.setDescription('Enable welcome messages with a ready-made template')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel where welcome messages are sent')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('template')
								.setDescription('The welcome template to use')
								.setRequired(false)
								.addChoices(...templateChoices())
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('template')
						.setDescription('Change the active welcome template')
						.addStringOption((option) =>
							option
								.setName('template')
								.setDescription('The welcome template to use')
								.setRequired(true)
								.addChoices(...templateChoices())
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('channel')
						.setDescription('Change the welcome message channel')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel where welcome messages are sent')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) => subcommand.setName('preview').setDescription('Preview the current welcome message'))
				.addSubcommand((subcommand) => subcommand.setName('status').setDescription('View the current welcome setup'))
				.addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Disable the welcome system'))
				.addSubcommand((subcommand) => subcommand.setName('vars').setDescription('View welcome message variables'))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'setup') return setupWelcome(interaction);
		if (subcommand === 'template') return updateTemplate(interaction);
		if (subcommand === 'channel') return updateChannel(interaction);
		if (subcommand === 'preview') return previewWelcome(interaction);
		if (subcommand === 'status') return showStatus(interaction);
		if (subcommand === 'disable') return disableWelcome(interaction);
		if (subcommand === 'vars') return showVariables(interaction);
	}
}

async function setupWelcome(interaction) {
	const channel = interaction.options.getChannel('channel', true);
	const templateId = interaction.options.getString('template') || 'classic';
	const template = getWelcomeTemplate(templateId);

	await upsertWelcomeConfig(interaction.guild.id, {
		welcomeChannelId: channel.id,
		enabled: true,
		templateId: template.id,
		messageType: template.type,
		...templateToLegacyFields(template)
	});

	return interaction.reply({
		embeds: [successEmbed(interaction, 'Welcome System Enabled', `Welcome messages will be sent in ${channel} using **${template.name}**.`)]
	});
}

async function updateTemplate(interaction) {
	const config = await WelcomeSchema.findOne({ guildId: interaction.guild.id });
	if (!config)
		return interaction.reply({
			embeds: [failEmbed(`The Welcome System has not been setup yet. Use ${commandMention('welcome setup')} first.`)],
			flags: MessageFlags.Ephemeral
		});

	const template = getWelcomeTemplate(interaction.options.getString('template', true));
	Object.assign(config, {
		enabled: true,
		templateId: template.id,
		messageType: template.type,
		...templateToLegacyFields(template),
		updatedAt: Date.now()
	});
	await config.save();

	return interaction.reply({
		embeds: [successEmbed(interaction, 'Welcome Template Updated', `New members will now receive the **${template.name}** welcome template.`)]
	});
}

async function updateChannel(interaction) {
	const config = await WelcomeSchema.findOne({ guildId: interaction.guild.id });
	if (!config)
		return interaction.reply({
			embeds: [failEmbed(`The Welcome System has not been setup yet. Use ${commandMention('welcome setup')} first.`)],
			flags: MessageFlags.Ephemeral
		});

	const channel = interaction.options.getChannel('channel', true);
	config.welcomeChannelId = channel.id;
	config.enabled = true;
	config.updatedAt = Date.now();
	await config.save();

	return interaction.reply({ embeds: [successEmbed(interaction, 'Welcome Channel Updated', `Welcome messages will now be sent in ${channel}.`)] });
}

async function previewWelcome(interaction) {
	const config = await WelcomeSchema.findOne({ guildId: interaction.guild.id });
	if (!config)
		return interaction.reply({
			embeds: [failEmbed(`The Welcome System has not been setup yet. Use ${commandMention('welcome setup')} first.`)],
			flags: MessageFlags.Ephemeral
		});

	const payload = renderWelcomePreview(interaction.member, config);
	return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function showStatus(interaction) {
	const config = await WelcomeSchema.findOne({ guildId: interaction.guild.id });
	if (!config)
		return interaction.reply({
			embeds: [failEmbed(`The Welcome System has not been setup yet. Use ${commandMention('welcome setup')} first.`)],
			flags: MessageFlags.Ephemeral
		});

	const template = getWelcomeTemplate(config.templateId || 'classic');
	const embed = new EmbedBuilder()
		.setColor(color.default)
		.setTitle('Welcome System Status')
		.setDescription(
			[
				`${config.enabled === false ? emojis.custom.warning : emojis.custom.success} **Status:** ${config.enabled === false ? 'Disabled' : 'Enabled'}`,
				`${emojis.custom.openfolder} **Channel:** <#${config.welcomeChannelId}>`,
				`${emojis.custom.pencil} **Template:** ${template.name}`,
				`${emojis.custom.info} **Style:** ${template.type === 'embed' ? 'Embed' : 'Regular message'}`
			].join('\n')
		)
		.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
		.setTimestamp();

	return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function disableWelcome(interaction) {
	const config = await WelcomeSchema.findOne({ guildId: interaction.guild.id });
	if (!config)
		return interaction.reply({ embeds: [failEmbed('The Welcome System has not been setup within the server.')], flags: MessageFlags.Ephemeral });

	await WelcomeSchema.deleteOne({ guildId: interaction.guild.id });
	return interaction.reply({
		embeds: [successEmbed(interaction, 'Welcome System Disabled', 'New member welcome messages will no longer be sent.')]
	});
}

async function showVariables(interaction) {
	const embed = new EmbedBuilder()
		.setColor(color.default)
		.setTitle('Welcome Variables')
		.setDescription(
			[
				'`{user}` Mention the new member',
				'`{userName}` Member username',
				'`{userTag}` Member tag',
				'`{userId}` Member ID',
				'`{serverName}` Server name',
				'`{serverMembers}` Current member count',
				'`{memberOrdinal}` Member count with suffix',
				'`{serverIcon}` Server icon URL',
				'`{accountAge}` Discord account age',
				'`\\n` New line'
			].join('\n')
		)
		.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
		.setTimestamp();

	return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function upsertWelcomeConfig(guildId, patch) {
	let config = await WelcomeSchema.findOne({ guildId });
	if (!config) config = new WelcomeSchema({ guildId, createdAt: Date.now() });

	Object.assign(config, patch, { updatedAt: Date.now() });
	await config.save();
	return config;
}

function templateChoices() {
	return listWelcomeTemplates().map((template) => ({
		name: template.name,
		value: template.id
	}));
}

function templateToLegacyFields(template) {
	return {
		message: template.message,
		title: template.embed?.title ?? null,
		footer: template.embed?.footer ?? null,
		thumbnailImage: template.embed?.image ?? null,
		authorName: template.embed?.author ?? null,
		iconURL: template.embed?.thumbnail ?? null,
		hexCode: template.embed?.color ?? null
	};
}

function successEmbed(interaction, title, description) {
	return new EmbedBuilder()
		.setColor(color.default)
		.setTitle(title)
		.setDescription(`${emojis.custom.success} ${description}`)
		.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
		.setTimestamp();
}

function failEmbed(description) {
	return new EmbedBuilder().setColor(color.fail).setDescription(`${emojis.custom.fail} ${description}`);
}

module.exports = {
	UserCommand
};
