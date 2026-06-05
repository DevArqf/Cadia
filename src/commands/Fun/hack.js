const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

const steps = [
	'Running the process...',
	'Installing dramatic fake malware...',
	'Finding imaginary passwords...',
	'Scanning devices and Wi-Fi...',
	'Locating snack supplies...',
	'Packaging completely fake evidence...'
];

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Hack the mentioned user hehehe ;)'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('hack')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('target').setDescription('The mentioned user will get hacked').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const target = interaction.options.getUser('target');

		if (!target) {
			return interaction.reply({
				components: [
					buildHackPanel(color.fail, `${emojis.custom.fail} **Target Missing**`, 'Mention a valid user to run the totally real hack.')
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		await interaction.reply({
			components: [buildHackPanel(color.default, `${emojis.custom.loading} **Hack Started**`, `${emojis.custom.person} Target: ${target}`)],
			flags: MessageFlags.IsComponentsV2
		});

		for (const [index, step] of steps.entries()) {
			await wait(1_200);
			await interaction.editReply({
				components: [
					buildHackPanel(
						color.default,
						`${emojis.custom.loading} **Hack Progress**`,
						`${emojis.custom.person} Target: ${target}\n${emojis.custom.arrowright} Step ${index + 1}/${steps.length}: ${step}`
					)
				],
				flags: MessageFlags.IsComponentsV2
			});
		}

		await wait(1_200);
		await interaction.editReply({
			components: [
				buildHackPanel(
					color.success,
					`${emojis.custom.success} **Mission Complete**`,
					`${emojis.custom.chad} Successfully fake-hacked ${target}. Respect increased.`
				)
			],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

function buildHackPanel(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

module.exports = {
	UserCommand
};
