const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../../config');
const { EmbedBuilder } = require('discord.js');
const Level = require('../../../lib/schemas/levelSchema');
const LevelConfig = require('../../../lib/schemas/levelConfigSchema');
const { createRankCard } = require('../../../lib/util/levelRankCard');
const { getLevelProgress, getUserRank } = require('../../../lib/util/leveling');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'View your level rank card'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('level')
				.setDescription(this.description)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('The user to view')
						.setRequired(false)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		await interaction.deferReply();

		const config = await LevelConfig.findOne({ guildId: interaction.guild.id });
		const target = interaction.options.getUser('user') || interaction.user;
		const member = await interaction.guild.members.fetch(target.id).catch(() => null);
		const levels = await Level.find({ guildId: interaction.guild.id });
		const level = levels.find((entry) => entry.userId === target.id) || new Level({ guildId: interaction.guild.id, userId: target.id });
		const rank = getUserRank(levels, target.id);
		const progress = getLevelProgress(level);
		const card = await createRankCard({ user: target, member, level, rank, guild: interaction.guild });

		const embed = new EmbedBuilder()
			.setColor(color.default)
			.setTitle(`${emojis.custom.gem} Level Profile`)
			.setDescription(
				`${emojis.custom.arrowright} **User:** ${target}\n${emojis.custom.arrowright} **Rank:** #${rank}\n${emojis.custom.arrowright} **Level:** ${progress.currentLevel.toLocaleString()}\n${emojis.custom.arrowright} **XP:** ${progress.currentXp.toLocaleString()}/${progress.neededXp.toLocaleString()}\n${emojis.custom.arrowright} **Module:** ${config?.enabled ? 'Enabled' : 'Disabled'}`
			)
			.setImage('attachment://rank-card.png')
			.setTimestamp();

		return interaction.editReply({ embeds: [embed], files: [card] });
	}
}

module.exports = {
	UserCommand
};
