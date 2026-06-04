const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { emojis, color } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'The credits that the Developers and Teams deserve!'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('credits')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${emojis.custom.heart2} **Cadia Credits**\nA huge thanks to everyone who helped build, shape, and support Cadia.`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`${emojis.custom.developer} **navin5023**`,
						`${emojis.custom.arrowright} Created multiple commands and features for Cadia as well as ensuring runs as intended.`,
						'',
						`${emojis.custom.developer} **theoreotm**`,
						`${emojis.custom.arrowright} Assisted with the framework choice and created Cadia's overall skeleton/base using the framework choice.`,
						'',
						`${emojis.custom.community} **Toowake Development's Team**`,
						`${emojis.custom.arrowright} Improved Cadia's codebase for better efficiency, performance, and features.`,
						'',
						`${emojis.custom.gem} **Diptodeep**`,
						`${emojis.custom.arrowright} Created and provided multiple minigame systems for Cadia.`
					].join('\n')
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.person} Requested by **${interaction.user.displayName}**`))
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setLabel("Navin's APIs").setStyle(ButtonStyle.Link).setURL('https://baymax-apis.onrender.com/docs/'),
					new ButtonBuilder().setLabel("Navin's GitHub").setStyle(ButtonStyle.Link).setURL('https://github.com/uhhhhh1231'),
					new ButtonBuilder().setLabel("Oreo's Website").setStyle(ButtonStyle.Link).setURL('https://oreotm.xyz/')
				)
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setLabel("Oreo's GitHub").setStyle(ButtonStyle.Link).setURL('https://github.com/TheOreoTM'),
					new ButtonBuilder()
						.setLabel("Toowake's Discord")
						.setStyle(ButtonStyle.Link)
						.setURL('https://discord.gg/toowake-dev-hosting-1121353922355929129')
				)
			);

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

module.exports = {
	UserCommand
};
