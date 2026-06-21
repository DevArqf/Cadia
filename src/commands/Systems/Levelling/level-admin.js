const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config');
const { ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const Level = require('../../../lib/schemas/levelSchema');
const LevelConfig = require('../../../lib/schemas/levelConfigSchema');
const { XP_PER_LEVEL } = require('../../../lib/util/leveling');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Administrator,
			description: 'Manage the levelling system'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('level-admin')
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('enable')
						.setDescription('Enable the levelling system')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel for level-up messages')
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Disable the levelling system'))
				.addSubcommand((subcommand) =>
					subcommand
						.setName('channel')
						.setDescription('Change the level-up message channel')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel for level-up messages')
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('message')
						.setDescription('Change the level-up message')
						.addStringOption((option) =>
							option
								.setName('message')
								.setDescription('Variables: {userName}, {userMention}, {userLevel}, {userXp}')
								.setMaxLength(1000)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('give-xp')
						.setDescription('Give XP to a user')
						.addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
						.addIntegerOption((option) =>
							option.setName('amount').setDescription('The XP amount').setMinValue(1).setMaxValue(100000).setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('give-level')
						.setDescription('Give levels to a user')
						.addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
						.addIntegerOption((option) =>
							option.setName('amount').setDescription('The level amount').setMinValue(1).setMaxValue(1000).setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('set-xp')
						.setDescription('Set a user current XP')
						.addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
						.addIntegerOption((option) =>
							option.setName('amount').setDescription('The XP amount').setMinValue(0).setMaxValue(99).setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('set-level')
						.setDescription('Set a user level')
						.addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
						.addIntegerOption((option) =>
							option.setName('amount').setDescription('The level').setMinValue(1).setMaxValue(1000).setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('reset-user')
						.setDescription('Reset a user level profile')
						.addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();

		try {
			if (['enable', 'disable', 'channel', 'message'].includes(subcommand)) {
				return this.handleConfig(interaction, subcommand);
			}

			return this.handleUserLevel(interaction, subcommand);
		} catch (error) {
			console.error(error);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} Oopsie, I was unable to update the levelling system.`)
				.setTimestamp();

			return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
		}
	}

	async handleConfig(interaction, subcommand) {
		const config = await getOrCreateConfig(interaction.guild.id);
		const channel = interaction.options.getChannel('channel');
		const message = interaction.options.getString('message');

		if (subcommand === 'enable') {
			config.enabled = true;
			if (channel) config.channelId = channel.id;
			if (!config.channelId) config.channelId = interaction.channel.id;
			await config.save();
			return interaction.reply({
				embeds: [createAdminEmbed('Levelling Enabled', `Level-up messages will be sent in <#${config.channelId}>.`)]
			});
		}

		if (subcommand === 'disable') {
			config.enabled = false;
			await config.save();
			return interaction.reply({ embeds: [createAdminEmbed('Levelling Disabled', 'The levelling module is now disabled for this server.')] });
		}

		if (subcommand === 'channel') {
			config.channelId = channel.id;
			await config.save();
			return interaction.reply({ embeds: [createAdminEmbed('Level Channel Updated', `Level-up messages will now be sent in ${channel}.`)] });
		}

		config.messages = [{ content: message }];
		await config.save();
		return interaction.reply({ embeds: [createAdminEmbed('Level Message Updated', `${emojis.custom.arrowright} ${message}`)] });
	}

	async handleUserLevel(interaction, subcommand) {
		const user = interaction.options.getUser('user', true);
		const amount = interaction.options.getInteger('amount');
		const level = await getOrCreateLevel(interaction.guild.id, user.id);

		if (subcommand === 'give-xp') {
			level.userXp += amount;
			level.totalXp += amount;
			normalizeLevel(level);
		}

		if (subcommand === 'give-level') {
			level.userLevel += amount;
			level.totalXp += amount * XP_PER_LEVEL;
		}

		if (subcommand === 'set-xp') {
			level.userXp = amount;
			level.totalXp = Math.max(level.totalXp, (level.userLevel - 1) * XP_PER_LEVEL + amount);
		}

		if (subcommand === 'set-level') {
			level.userLevel = amount;
			level.totalXp = Math.max(level.totalXp, (amount - 1) * XP_PER_LEVEL + level.userXp);
		}

		if (subcommand === 'reset-user') {
			level.userXp = 0;
			level.userLevel = 1;
			level.totalXp = 0;
		}

		await level.save();

		return interaction.reply({
			embeds: [
				createAdminEmbed(
					'Level Profile Updated',
					`${emojis.custom.arrowright} **User:** ${user}\n${emojis.custom.arrowright} **Level:** ${level.userLevel}\n${emojis.custom.arrowright} **XP:** ${level.userXp}/${XP_PER_LEVEL}\n${emojis.custom.arrowright} **Total XP:** ${level.totalXp}`
				)
			]
		});
	}
}

async function getOrCreateConfig(guildId) {
	let config = await LevelConfig.findOne({ guildId });
	if (!config) config = await LevelConfig.create({ guildId });
	return config;
}

async function getOrCreateLevel(guildId, userId) {
	let level = await Level.findOne({ guildId, userId });
	if (!level) level = await Level.create({ guildId, userId });
	return level;
}

function normalizeLevel(level) {
	while (level.userXp >= XP_PER_LEVEL) {
		level.userXp -= XP_PER_LEVEL;
		level.userLevel += 1;
	}
}

function createAdminEmbed(title, description) {
	return new EmbedBuilder().setColor(color.default).setTitle(`${emojis.custom.settings} ${title}`).setDescription(description).setTimestamp();
}

module.exports = {
	UserCommand
};
