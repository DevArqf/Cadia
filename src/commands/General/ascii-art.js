const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { promisify } = require('util');
const figlet = require('figlet');
const { MessageFlags } = require('discord.js');
const { emojis } = require('../../config');

const renderFiglet = promisify(figlet.text);

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Create beautiful Ascii Arts'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('ascii')
				.setDescription(this.description)
                .addStringOption(option => option
                    .setName("text")
                    .setDescription("The text")
                    .setRequired(true))
		        );
	        }

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const text = interaction.options.getString("text");

		try {
			const rendered = await renderFiglet(text, { font: 'Doom' });
			const response = `\`\`\`${rendered}\`\`\``;

			return interaction.reply(response.length > 2000 ? `${response.slice(0, 1990)}\n\`\`\`` : response);
		} catch (error) {
			console.error(error);

			return interaction.reply({
				content: `${emojis.custom.fail} Oopsie, I encountered an error while rendering that text.`,
				flags: MessageFlags.Ephemeral
			});
		}
    }
};

module.exports = {
	UserCommand
};
