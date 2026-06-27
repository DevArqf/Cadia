const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Trust me, the answer is 100% accurate. No questions asked!'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('how-gae')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('target').setDescription("Target's gae percentage."))
		);
	}

	async chatInputRun(interaction) {
		const target = interaction.options.getUser('target') || interaction.user;
		const percentage = Math.floor(Math.random() * 101);

		await interaction.reply({
			components: [
				new ContainerBuilder()
					.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.question} **Accuracy Meter**`))
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`${emojis.custom.person} **Target:** ${target}\n${emojis.custom.info} **Result:** **${percentage}%**`
						)
					)
			],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

module.exports = {
	UserCommand
};
