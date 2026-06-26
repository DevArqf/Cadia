const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
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
	constructor(context, options) {
		super(context, {
			...options,
			description: 'This is very legit, FREE NITRO!'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('nitro').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		const code = generateCode(16);
		const url = `https://discord.gift/${code}`;

		await interaction.reply({
			components: [
				new ContainerBuilder()
					.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.gem} **Definitely Real Nitro**`))
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.arrowright} Gift code: \`${code}\``))
					.addActionRowComponents(
						new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Claim').setStyle(ButtonStyle.Link).setURL(url))
					)
			],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

function generateCode(length) {
	const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

module.exports = {
	UserCommand
};
