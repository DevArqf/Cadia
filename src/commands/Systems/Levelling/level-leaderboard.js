const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../../config');
const { EmbedBuilder } = require('discord.js');
const Level = require('../../../lib/schemas/levelSchema');
const { sortLevels } = require('../../../lib/util/leveling');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'View the server level leaderboard'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('level-leaderboard').setDescription(this.description));
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const levels = sortLevels(await Level.find({ guildId: interaction.guild.id })).slice(0, 10);

		if (!levels.length) {
			return interaction.reply(`${emojis.custom.fail} No one has earned level XP in this server yet.`);
		}

		const lines = await Promise.all(
			levels.map(async (level, index) => {
				const user = await interaction.client.users.fetch(level.userId).catch(() => null);
				const name = user ? `**${user.username}**` : `\`${level.userId}\``;
				return `${getMedal(index)} ${name}\n${emojis.custom.arrowright} Level **${level.userLevel}** | XP **${level.userXp}/100** | Total **${level.totalXp}**`;
			})
		);

		const embed = new EmbedBuilder()
			.setColor(color.default)
			.setTitle(`${emojis.custom.gem} Level Leaderboard`)
			.setDescription(lines.join('\n\n'))
			.setTimestamp();

		return interaction.reply({ embeds: [embed] });
	}
}

function getMedal(index) {
	if (index === 0) return '1.';
	if (index === 1) return '2.';
	if (index === 2) return '3.';
	return `${index + 1}.`;
}

module.exports = {
	UserCommand
};
