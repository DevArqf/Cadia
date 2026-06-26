const axios = require('axios');
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
			description: 'Enlarge any emoji and save or steal it :)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('enlarge')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('emoji').setDescription('The emoji you would like to enlarge').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		let emoji = interaction.options.getString('emoji')?.trim();

		if (emoji.startsWith('<') && emoji.endsWith('>')) {
			const id = emoji.match(/\d{15,}/g)?.[0];
			if (id) emoji = await getEmojiUrl(id);
		}

		if (!emoji?.startsWith('https')) {
			return interaction.reply({
				components: [
					buildStatusContainer(
						color.fail,
						`${emojis.custom.fail} **Emoji Cannot Be Enlarged**`,
						`${emojis.custom.arrowright} Default Discord emojis do not have an image file I can enlarge.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		const container = buildStatusContainer(
			color.default,
			`${emojis.custom.emoji1} **Emoji Enlarged**`,
			`${emojis.custom.success} Your emoji is ready to view, save, or reuse.`
		)
			.addMediaGalleryComponents(
				new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(emoji).setDescription('Enlarged emoji preview'))
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.person} Requested by **${interaction.user.displayName}**`))
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Emoji').setStyle(ButtonStyle.Link).setURL(emoji))
			);

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

async function getEmojiUrl(id) {
	const type = await axios
		.get(`https://cdn.discordapp.com/emojis/${id}.gif`)
		.then(() => 'gif')
		.catch(() => 'png');

	return `https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless`;
}

function buildStatusContainer(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

module.exports = {
	UserCommand
};
