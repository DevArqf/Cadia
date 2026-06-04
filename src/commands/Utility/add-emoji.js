const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder, PermissionsBitField , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
            requiredUserPermissions: ['ManageGuildExpressions'],
			description: "Add your desired emoji within the server!"
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
            .addAttachmentOption(option => option.setName('emoji').setDescription('Specified file will be uploaded and used as an emoji').setRequired(true))
    .addStringOption(option => option.setName('name').setDescription(`Specified name will be the emoji's name`).setRequired(true).setMinLength(2).setMaxLength(30)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        try {
            // Permissions //
            // if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) 
            // return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`)], flags: MessageFlags.Ephemeral});
 
            const name = interaction.options.getString('name');
        const upload = interaction.options.getAttachment('emoji');
 
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Loading your **emoji**...`)] });
 
        const emoji = await interaction.guild.emojis.create({
 
            name: `${name}`,
            attachment: `${upload.attachment}`
 
        }).catch(err => {
            setTimeout(() => {
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.fail}`).setDescription(`${emojis.custom.fail} You have reached the **maximum** amount of **emoji** slots!`)] });
            }, 2000)
        })
 
        setTimeout(() => {
            if (!emoji) return;
 
            const embed = new EmbedBuilder()
            .setColor(color.default)
            .setTitle(`Emoji Added`)
            .addFields({ name: `${emojis.custom.emoji1} \`-\` Emoji's Name`, value: `${emojis.custom.arrowright} Emoji added as: "<:${name}:${emoji.id}>"`})
            .setFooter({ text: `Emoji Added by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
 
            interaction.editReply({ content: ``, embeds: [embed]});
        }, 3000)

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
