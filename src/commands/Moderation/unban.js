const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { PermissionsBitField, EmbedBuilder , MessageFlags} = require('discord.js');
const { color, emojis } = require('../../config');


class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
         requiredUserPermissions: ['BanMembers'],
			description: 'Unbans a user, allowing them to join the server again.'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('unban')
				.setDescription(this.description)
				.addStringOption(option => 
                    option.setName('user')
                        .setDescription('The user ID to unban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for unbanning the user')
                        .setRequired(false)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		// Defining Things
        const userToUnban = interaction.options.getString('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permissions
        // if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        //    return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You are not **authorized** to **execute** this command!`)], flags: MessageFlags.Ephemeral });
        // }
        
        if (Number.isNaN(userToUnban)) {
            return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You have inputted something that is not a number!`)], flags: MessageFlags.Ephemeral });
        }
        
        const user = await interaction.client.users.fetch(userToUnban);
        
        // Unban the user
        await interaction.guild.bans.remove( user.id )
            .then(() => {
                const embed = new EmbedBuilder()
                    .setColor(color.default)
                    .setDescription(`${emojis.custom.info} \`-\` **${user.tag}** has been **unbanned**!`)
                    .addFields(
                        {
                            name: `${emojis.custom.mail} \`-\` **Reason:**`,
                            value: `${emojis.custom.arrowright} **${reason}**`,
                            inline: false
                        },
                        {
                            name: `${emojis.custom.person} \`-\` **Moderator:**`,
                            value: `${emojis.custom.arrowright} **${interaction.user.displayName}**`,
                            inline: false
                        }
                    )
                    .setFooter({ text: `User Unbanned: ${userToUnban}` })
                    .setTimestamp();

                interaction.reply({ content: '', embeds: [embed] });
            })
            .catch(error => {
                console.error(error);
        	    const errorEmbed = new EmbedBuilder()
            	    .setColor(color.fail)
            	    .setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
            	    .setTimestamp();

        	    return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            });   
    }
};

module.exports = {
	UserCommand
};