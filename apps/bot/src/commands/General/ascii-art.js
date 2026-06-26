const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const figlet = require('figlet');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const { color, emojis } = require('../../config');

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
				.addStringOption((option) => option.setName('text').setDescription('The text').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const text = interaction.options.getString('text');

		try {
			const rendered = await figlet.text(text, { font: 'Doom' });
			const artwork = trimCodeBlock(rendered, 3_600);
			const container = new ContainerBuilder()
				.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${emojis.custom.pencil} **ASCII Art**\n${emojis.custom.arrowright} Source text: \`${text}\``)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\`\n${artwork}\n\`\`\``))
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${emojis.custom.person} Created for **${interaction.user.displayName}**`)
				);

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(error);

			return interaction.reply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(`${emojis.custom.fail} I could not render that text as ASCII art.`)
						)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

function trimCodeBlock(value, maxLength) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

module.exports = {
	UserCommand
};
