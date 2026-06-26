const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'This is not able to be discussed about'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('pp').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		const size = Math.floor(Math.random() * 10) + 1;
		const result = `8${'='.repeat(size)}D`;

		await interaction.reply({
			components: [
				new ContainerBuilder()
					.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.gem} **Size Check**`))
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`${emojis.custom.person} **User:** ${interaction.user}\n${emojis.custom.arrowright} \`${result}\``
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
