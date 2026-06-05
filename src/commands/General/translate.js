const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const translate = require('@iamtraction/google-translate');

const languageChoices = [
	{ name: 'Automatic', value: 'auto' },
	{ name: 'Arabic', value: 'ar' },
	{ name: 'Bengali', value: 'bn' },
	{ name: 'Chinese Simplified', value: 'zh-cn' },
	{ name: 'Danish', value: 'da' },
	{ name: 'Dutch', value: 'nl' },
	{ name: 'English', value: 'en' },
	{ name: 'Filipino', value: 'tl' },
	{ name: 'French', value: 'fr' },
	{ name: 'German', value: 'de' },
	{ name: 'Greek', value: 'el' },
	{ name: 'Hindi', value: 'hi' },
	{ name: 'Italian', value: 'it' },
	{ name: 'Japanese', value: 'ja' },
	{ name: 'Polish', value: 'pl' },
	{ name: 'Russian', value: 'ru' },
	{ name: 'Spanish', value: 'es' },
	{ name: 'Swedish', value: 'sv' }
];

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			defaultCooldown: 5,
			description: 'Translate your message to a different language'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('translate')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('text').setDescription('Message Input').setRequired(true))
				.addStringOption((option) =>
					option
						.setName('from')
						.setDescription('choose a language to translate from')
						.setRequired(true)
						.setChoices(...languageChoices)
				)
				.addStringOption((option) =>
					option
						.setName('to')
						.setDescription('choose a language to translate to')
						.setRequired(true)
						.setChoices(...languageChoices)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		await interaction.deferReply();

		try {
			const msg = interaction.options.getString('text');
			const from = interaction.options.getString('from');
			const to = interaction.options.getString('to');
			const translated = await translate(msg, { from, to });

			const container = new ContainerBuilder()
				.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`${emojis.custom.globe} **Translation Complete**\n${emojis.custom.arrowright} ${formatLanguage(from)} to ${formatLanguage(to)}`
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.pencil} **Original**\n${msg}`))
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.comment} **Translated**\n${translated.text}`))
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${emojis.custom.person} Translated for **${interaction.user.displayName}**`)
				);

			await interaction.editReply({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(error);

			await interaction.editReply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.fail} I could not translate that message.`))
				],
				flags: MessageFlags.IsComponentsV2
			});
		}
	}
}

function formatLanguage(value) {
	return languageChoices.find((choice) => choice.value === value)?.name ?? value;
}

module.exports = {
	UserCommand
};
