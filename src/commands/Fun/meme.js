const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const axios = require('axios');
const { EmbedBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Get a random meme to make you giggle'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('meme')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const response = await axios.get('https://meme-api.com/gimme/memes', {
				headers: {
					'User-Agent': 'Cadia-Bot/1.3.0'
				},
				timeout: 10000
			});

			if (!response.data?.url || response.data.nsfw) {
				return interaction.reply(`${emojis.custom.fail} I **failed** to **fetch** a meme. Please try again later.`);
			}

			const { postLink, title, url, ups } = response.data;
			const embed = new EmbedBuilder()
				.setColor(color.random)
				.setTitle(title)
				.setURL(postLink)
				.setImage(url)
				.setTimestamp()
				.setFooter({ text: `Requested by ${interaction.user.displayName} | Upvotes: ${ups ?? 0}`, iconURL: interaction.user.displayAvatarURL() });

			return interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(`Failed to fetch meme: ${error.response?.status ?? error.code ?? error.message}`);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} I **failed** to **fetch** a meme. Please try again later.`)
				.setTimestamp();

			return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
		}
	}
}

module.exports = {
	UserCommand
};
