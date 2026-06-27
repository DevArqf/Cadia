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
			const { postLink, title, url, ups, provider } = await fetchRandomMeme();
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
						`${emojis.custom.upvote} **Upvotes:** ${ups ?? 'Unavailable'}\n` +
							`${emojis.custom.info} **Source:** ${provider}\n` +
							`${emojis.custom.person} Requested by **${interaction.user.displayName}**`
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
			this.container.logger.warn(`Meme providers unavailable: ${error.message}`);

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

async function fetchRandomMeme(request = axios) {
	const failures = [];
	try {
		const response = await request.get('https://meme-api.com/gimme/memes', requestOptions());
		if (response.data?.url && !response.data.nsfw) {
			return {
				postLink: response.data.postLink || response.data.url,
				title: response.data.title || 'Random Meme',
				url: response.data.url,
				ups: response.data.ups,
				provider: 'Meme API'
			};
		}
		failures.push('Meme API returned an invalid or NSFW response');
	} catch (error) {
		failures.push(`Meme API ${errorCode(error)}`);
	}

	try {
		const response = await request.get('https://api.imgflip.com/get_memes?type=image', requestOptions());
		const memes = response.data?.success ? response.data.data?.memes : null;
		if (Array.isArray(memes) && memes.length) {
			const meme = memes[Math.floor(Math.random() * memes.length)];
			return {
				postLink: `https://imgflip.com/memetemplate/${meme.id}`,
				title: meme.name || 'Popular Meme',
				url: meme.url,
				ups: null,
				provider: 'Imgflip'
			};
		}
		failures.push('Imgflip returned no meme templates');
	} catch (error) {
		failures.push(`Imgflip ${errorCode(error)}`);
	}

	throw new Error(failures.join('; '));
}

function requestOptions() {
	return {
		headers: { 'User-Agent': branding.userAgent },
		timeout: 10_000
	};
}

function errorCode(error) {
	return error.response?.status ?? error.code ?? error.message;
}

module.exports = {
	UserCommand,
	fetchRandomMeme
};
