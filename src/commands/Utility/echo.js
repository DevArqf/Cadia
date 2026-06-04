const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder, PermissionsBitField, ChannelType , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
            requiredUserPermissions: ['ManageMessages'],
			description: "Say something as Cadia!"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
            .setName('echo')
            .setDescription(this.description)
            .setDMPermission(false)
            .addStringOption(option => option
                .setName('text')
                .setDescription('Specified text will be your message')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2000))
            .addChannelOption(option => option
                .setName('channel')
                .setDescription('Specified channel will receive your message')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        try {
        // Permissions
		// if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) 
        // return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`)], flags: MessageFlags.Ephemeral });
        // else {

            const channel = await interaction.options.getChannel('channel') || interaction.channel;
            const message = await interaction.options.getString('text');
            await channel.send({ content: message});
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} Your message ${message} has been **successfully** sent in ${channel}`)], flags: MessageFlags.Ephemeral });

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
