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
			description: 'Add your desired sticker within the server!'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('add-sticker')
				.setDescription(this.description)
				.addAttachmentOption((option) =>
					option.setName('sticker').setDescription('Specified PNG/JPEG file will be uploaded as a sticker').setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription("Specified name will be the sticker's name")
						.setRequired(true)
						.setMinLength(2)
						.setMaxLength(29)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const name = interaction.options.getString('name');
		const upload = interaction.options.getAttachment('sticker');

		if (upload.contentType?.toLowerCase() === 'image/gif') {
			return interaction.reply({
				components: [
					buildStatusContainer(
						color.fail,
						`${emojis.custom.fail} **Sticker Rejected**`,
						`${emojis.custom.arrowright} Animated stickers cannot be uploaded with this command. Use a PNG or JPEG file.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		try {
			await interaction.reply({
				components: [
					buildStatusContainer(
						color.default,
						`${emojis.custom.loading} **Uploading Sticker**`,
						`${emojis.custom.arrowright} **Name:** \`${name}\`\n${emojis.custom.arrowright} **File:** ${upload.name}`
					)
				],
				flags: MessageFlags.IsComponentsV2
			});

			const sticker = await interaction.guild.stickers.create({
				file: upload.attachment,
				name
			});

			await interaction.editReply({
				components: [
					buildSuccessContainer(
						`${emojis.custom.success} **Sticker Added**`,
						[
							`${emojis.custom.emoji1} **Sticker:** **${sticker.name}**`,
							`${emojis.custom.pencil} **ID:** \`${sticker.id}\``,
							`${emojis.custom.person} **Added by:** ${interaction.user}`
						].join('\n'),
						sticker.url
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
						`${emojis.custom.fail} **Sticker Upload Failed**`,
						`${emojis.custom.arrowright} I could not add that sticker. The server may be full, the file may be invalid, or I may be missing permissions.`
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
	const container = buildStatusContainer(color.success, title, body);
	if (!url) return container;

	return container.addActionRowComponents(
		new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Sticker').setStyle(ButtonStyle.Link).setURL(url))
	);
}

module.exports = {
	UserCommand
};
