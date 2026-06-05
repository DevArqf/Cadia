const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
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
			description: "Fetch a user's avatar from the server"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('avatar')
				.setDescription(this.description)
				.setDMPermission(false)
				.addUserOption((option) => option.setName('user').setDescription('The users avatar to fetch').setRequired(false))
				.addStringOption((option) =>
					option.setName('id').setDescription('If the user has left, you can enter the user ID').setRequired(false)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const userOption = interaction.options.getUser('user');
			const idOption = interaction.options.getString('id');
			const user = userOption ?? (idOption ? await interaction.client.users.fetch(idOption) : interaction.user);
			const avatar = user.displayAvatarURL({ extension: 'png', size: 2048 });
			const animatedAvatar = user.displayAvatarURL({ extension: 'gif', size: 2048 });

			const container = new ContainerBuilder()
				.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`${emojis.custom.person} **${user.username}'s Avatar**\n${emojis.custom.pencil} User ID: \`${user.id}\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addMediaGalleryComponents(
					new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(avatar).setDescription(`${user.username}'s avatar`))
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addActionRowComponents(
					new ActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setLabel('PNG')
							.setStyle(ButtonStyle.Link)
							.setURL(user.displayAvatarURL({ extension: 'png', size: 2048 })),
						new ButtonBuilder()
							.setLabel('JPG')
							.setStyle(ButtonStyle.Link)
							.setURL(user.displayAvatarURL({ extension: 'jpg', size: 2048 })),
						new ButtonBuilder()
							.setLabel('WebP')
							.setStyle(ButtonStyle.Link)
							.setURL(user.displayAvatarURL({ extension: 'webp', size: 2048 })),
						new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(animatedAvatar)
					)
				);

			await interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		} catch (error) {
			console.error(error);

			await interaction.reply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.fail} I could not fetch that user's avatar.`))
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

module.exports = {
	UserCommand
};
