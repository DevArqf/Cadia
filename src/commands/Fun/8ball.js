const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

const answers = [
	'It is certain',
	'Reply hazy, try again',
	"Don't count on it",
	'It is decidedly so',
	'Ask again later',
	'My reply is no',
	'Without a doubt',
	'Better not tell you now',
	'My sources say no',
	'Yes definitely',
	'Cannot predict now',
	'Outlook not so good',
	'You may rely on it',
	'Concentrate and ask again',
	'Very doubtful',
	'As I see it, yes',
	'Most likely',
	'Outlook good',
	'Yes',
	'No',
	'Signs point to yes'
];

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Ask 8 Ball a question'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('8ball')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('question').setDescription('The question you want to ask 8ball').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		try {
			const question = interaction.options.getString('question');
			const answer = answers[Math.floor(Math.random() * answers.length)];

			await interaction.reply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.question} **8 Ball**`))
						.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(
								`${emojis.custom.pencil} **Question:** ${question}\n${emojis.custom.mail} **Response:** ${answer}`
							)
						)
						.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(`${emojis.custom.person} Asked by **${interaction.user.displayName}**`)
						)
				],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(error);
			await interaction.reply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.fail} I could not ask the 8 Ball right now.`))
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

module.exports = {
	UserCommand
};
