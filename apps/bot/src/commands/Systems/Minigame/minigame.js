const { EmbedBuilder, MessageFlags } = require('discord.js');
const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../../config');
const { registerMinigameCommand } = require('../../../lib/minigames/register');
const { runGamecordGame } = require('../../../lib/minigames/gamecord');
const { runCustomGame } = require('../../../lib/minigames/custom');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: "Cadia's list of minigames"
		});
	}

	registerApplicationCommands(registry) {
		registerMinigameCommand(registry, this.description);
	}

	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();

		try {
			if (await runCustomGame(interaction, subcommand)) return;
			if (await runGamecordGame(interaction, subcommand)) return;
			throw new Error(`Unsupported minigame: ${subcommand}`);
		} catch (error) {
			this.container.logger.error(error);
			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} The minigame could not be started. Please try again, or report the issue if it continues.`)
				.setTimestamp();

			if (interaction.deferred || interaction.replied) {
				return interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
			}
			return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
		}
	}
}

module.exports = {
	UserCommand
};
