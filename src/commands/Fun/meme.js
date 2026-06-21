const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { branding, color, emojis } = require('../../config');
const axios = require('axios');
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
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Get a random meme to make you giggle'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('meme').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

		try {
			const response = await axios.get('https://meme-api.com/gimme/memes', {
				headers: {
					'User-Agent': branding.userAgent
				},
				timeout: 10000
			});

			if (!response.data?.url || response.data.nsfw) throw new Error('Invalid meme response');

			const { postLink, title, url, ups } = response.data;
			const container = new ContainerBuilder()
				.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${emojis.custom.tada1} **Random Meme**\n${emojis.custom.comment} ${title}`)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url).setDescription(title)))
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`${emojis.custom.upvote} **Upvotes:** ${ups ?? 0}\n${emojis.custom.person} Requested by **${interaction.user.displayName}**`
					)
				)
				.addActionRowComponents(
					new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Post').setStyle(ButtonStyle.Link).setURL(postLink))
				);

			return interaction.editReply({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(`Failed to fetch meme: ${error.response?.status ?? error.code ?? error.message}`);

			return interaction.editReply({
				components: [
					new ContainerBuilder()
						.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(`${emojis.custom.fail} I failed to fetch a meme. Please try again later.`)
						)
				],
				flags: MessageFlags.IsComponentsV2
			});
		}
	}
}

module.exports = {
	UserCommand
};
