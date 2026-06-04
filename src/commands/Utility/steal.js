const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder, PermissionsBitField , MessageFlags} = require('discord.js');
const { default: axios } = require('axios');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
            requiredUserPermissions: ['ManageGuildExpressions'],
			description: "Steal emojis to add to your own server"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
            .setName('steal')
            .setDescription(this.description)
            .addStringOption(option => option.setName('emoji').setDescription('The emoji you want to add to the server').setRequired(true))
            .addStringOption(option => option.setName('name').setDescription('The name for your emoji').setRequired(true)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        try {
            // Permissions //
            // if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) 
            //    return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`)], flags: MessageFlags.Ephemeral});
 
            let emoji = interaction.options.getString('emoji')?.trim();
            const name = interaction.options.getString('name');
     
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
                return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You **cannot** steal **default** emojis!`)], flags: MessageFlags.Ephemeral})
            }
     
            if (!emoji.startsWith("https")) {
                return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You **cannot** steal **default** emojis!`)], flags: MessageFlags.Ephemeral})
            }
     
            interaction.guild.emojis.create({ attachment: `${emoji}`, name: `${name}`})
            .then(emoji => {
                const embed = new EmbedBuilder()
                .setColor(color.default)
                .setDescription(`${emojis.custom.success} Added ${emoji} as "**${name}**"`)
                .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
     
                return interaction.reply({ embeds: [embed] });
            });
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor(color.fail)
                .setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
                .setTimestamp();
    
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }
    }
};

module.exports = {
	UserCommand
};
