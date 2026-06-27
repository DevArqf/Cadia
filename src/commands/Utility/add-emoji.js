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
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['ManageGuildExpressions'],
			description: 'Add your desired emoji within the server!'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('add-emoji')
				.setDescription(this.description)
				.addAttachmentOption((option) =>
					option.setName('emoji').setDescription('Specified file will be uploaded and used as an emoji').setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription("Specified name will be the emoji's name")
						.setRequired(true)
						.setMinLength(2)
						.setMaxLength(30)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const name = interaction.options.getString('name');
		const upload = interaction.options.getAttachment('emoji');

		try {
			await interaction.reply({
				components: [
					buildStatusContainer(
						color.default,
						`${emojis.custom.loading} **Uploading Emoji**`,
						`${emojis.custom.arrowright} **Name:** \`${name}\`\n${emojis.custom.arrowright} **File:** ${upload.name}`
					)
				],
				flags: MessageFlags.IsComponentsV2
			});

			const emoji = await interaction.guild.emojis.create({
				name,
				attachment: upload.attachment
			});

			await interaction.editReply({
				components: [
					buildSuccessContainer(
						`${emojis.custom.success} **Emoji Added**`,
						[
							`${emojis.custom.emoji1} **Emoji:** ${emoji}`,
							`${emojis.custom.pencil} **Name:** \`${emoji.name}\``,
							`${emojis.custom.person} **Added by:** ${interaction.user}`
						].join('\n'),
						emoji.imageURL()
					)
				],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(error);

			const response = {
				components: [
					buildStatusContainer(
						color.fail,
						`${emojis.custom.fail} **Emoji Upload Failed**`,
						`${emojis.custom.arrowright} I could not add that emoji. The server may be full, the file may be invalid, or I may be missing permissions.`
					)
				],
				flags: MessageFlags.IsComponentsV2
			};

			if (interaction.replied || interaction.deferred) return interaction.editReply(response);
			return interaction.reply({ ...response, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
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

function buildSuccessContainer(title, body, url) {
	return buildStatusContainer(color.success, title, body).addActionRowComponents(
		new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Emoji').setStyle(ButtonStyle.Link).setURL(url))
	);
}

module.exports = {
	UserCommand
};
