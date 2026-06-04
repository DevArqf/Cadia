const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
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
			description: "Enlarge any emoji and save or steal it :)"
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
                .addStringOption((option) => option
                    .setName('emoji')
                    .setDescription('The emoji you would like to enlarge')
                    .setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		
        let emoji = interaction.options.getString('emoji')?.trim();

        if (emoji.startsWith("<") && emoji.endsWith(">")) {
            
            const id = emoji.match(/\d{15,}/g)[0];

            const type = await axios.get(`https://cdn.discordapp.com/emojis/${id}.gif`)
            .then(image => {
                if (image) return "gif"
                else return "png"
            }).catch(err => {
                return "png"
            })

            emoji = `https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless`
        }

        if (!emoji.startsWith("http")) {
            return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You **cannot** enlarge default emojis!`)], flags: MessageFlags.Ephemeral })
        }

        if (!emoji.startsWith("https")) {
            return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You **cannot** enlarge default emojis!`)], flags: MessageFlags.Ephemeral })
        }

        const embed = new EmbedBuilder()
        .setColor(color.default)
        .setDescription(`${emojis.custom.success} Your emoji has been **successfully** enlarged`)
        .setImage(emoji)
        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = {
	UserCommand
};