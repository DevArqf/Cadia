const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ChannelType, ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['ManageMessages'],
			description: 'Say something as Cadia!'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('echo')
				.setDescription(this.description)
				.setDMPermission(false)
				.addStringOption((option) =>
					option.setName('text').setDescription('Specified text will be your message').setRequired(true).setMinLength(1).setMaxLength(2000)
				)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Specified channel will receive your message')
						.setRequired(false)
						.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const channel = interaction.options.getChannel('channel') || interaction.channel;
			const message = interaction.options.getString('text');

			await channel.send({ content: message });

			await interaction.reply({
				components: [
					buildStatusContainer(
						color.success,
						`${emojis.custom.success} **Message Delivered**`,
						[
							`${emojis.custom.comment} **Destination:** ${channel}`,
							`${emojis.custom.person} **Sent by:** ${interaction.user}`,
							`${emojis.custom.pencil} **Preview:** ${truncate(message, 160)}`
						].join('\n')
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		} catch (error) {
			console.error(error);

			await interaction.reply({
				components: [buildErrorContainer()],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

function buildStatusContainer(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

function buildErrorContainer() {
	return buildStatusContainer(
		color.fail,
		`${emojis.custom.fail} **Delivery Failed**`,
		`${emojis.custom.arrowright} I could not send that message. Please check my channel permissions and try again.`
	);
}

function truncate(value, maxLength) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

module.exports = {
	UserCommand
};
