const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { emojis, color } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

const lines = [
	'Are you a keyboard? Because you are just my type.',
	'Are you Wi-Fi? Because I am feeling a connection.',
	'Do you have a map? I keep getting lost in this conversation.',
	'Are you a campfire? Because you bring the spark.',
	'Are you made of copper and tellurium? Because you are Cu-Te.',
	'Are you a charger? Because my energy changes around you.',
	'You must be a notification, because you just got my attention.',
	'Are you a rare drop? Because I was not expecting to find you.',
	'Are you a playlist? Because I could keep you on repeat.',
	'Are you a patch note? Because you just improved my day.'
];

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: "Get girls by using Cadia's rizz ;)"
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('rizz').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		try {
			const line = lines[Math.floor(Math.random() * lines.length)];

			await interaction.reply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.heart2} **Rizz Delivery**`))
						.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.comment} ${line}`))
						.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(`${emojis.custom.person} Requested by **${interaction.user.displayName}**`)
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
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.fail} I could not generate rizz right now.`))
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

module.exports = {
	UserCommand
};
