const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Search a word in the dictionary'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('dictionary')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('word').setDescription('The word you want to search').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const word = interaction.options.getString('word');
		const data = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

		if (!data.ok) {
			return interaction.reply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(`${emojis.custom.fail} I could not find a dictionary entry for \`${word}\`.`)
						)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		const [result] = await data.json();
		const meanings = result.meanings.slice(0, 3);
		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${emojis.custom.openfolder} **Dictionary Result**\n${emojis.custom.arrowright} Word: **${result.word}**`
				)
			);

		for (const meaning of meanings) {
			const definition = meaning.definitions[0]?.definition || 'No definition found.';
			const example = meaning.definitions[0]?.example || 'No example available.';

			container
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						[
							`${emojis.custom.info} **${meaning.partOfSpeech.toUpperCase()}**`,
							`${emojis.custom.arrowright} **Definition:** ${definition}`,
							`${emojis.custom.comment} **Example:** ${example}`
						].join('\n')
					)
				);
		}

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

module.exports = {
	UserCommand
};
