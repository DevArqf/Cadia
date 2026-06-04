const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder , MessageFlags} = require('discord.js');

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
                        .addUserOption(option => option
                                .setName('user')
                                .setDescription(`The users avatar to fetch`)
                                .setRequired(false))
                        .addStringOption(option => option
                                .setName('id')
                                .setDescription(`If the user has left, you can enter the user ID`)
                                .setRequired(false)),
	        );
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {

	    const { client, member } = interaction;
        const userOption = interaction.options.getUser('user');
        const idOption = interaction.options.getString('id');

        let user;

        if (userOption) {
            user = userOption;

        } else if (idOption) {
            try {
                user = await client.users.fetch(idOption);
            } catch (error) {

                console.error(error);
                const errorEmbed = new EmbedBuilder()
                    .setColor(color.fail)
                    .setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                return;
            }
            
        } else {
            user = member.user;
        }

        const userAvatar = user.displayAvatarURL({ size: 2048, dynamic: true });

        const embed = new EmbedBuilder()
            .setColor(color.default)
            .setAuthor({ name: `${user.username}'s Avatar`, iconURL: `${user.displayAvatarURL({ size: 64, dynamic: true })}`})
            .setImage(userAvatar)
            .setTimestamp()
            .setFooter({ text: `User ID: ${user.id}` });

        const png = new ButtonBuilder()
            .setLabel('PNG')
            .setStyle(ButtonStyle.Link)
            .setURL(user.displayAvatarURL({ size: 2048, format: 'png' }));

        const jpg = new ButtonBuilder()
            .setLabel('JPG')
            .setStyle(ButtonStyle.Link)
            .setURL(user.displayAvatarURL({ size: 2048, format: 'jpg' }));

        const jpeg = new ButtonBuilder()
            .setLabel('JPEG')
            .setStyle(ButtonStyle.Link)
            .setURL(user.displayAvatarURL({ size: 2048, format: 'jpeg' }));

        const gif = new ButtonBuilder()
            .setLabel('GIF')
            .setStyle(ButtonStyle.Link)
            .setURL(user.displayAvatarURL({ size: 2048, format: 'gif' }));

        const row = new ActionRowBuilder().addComponents(png, jpg, jpeg, gif);

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
            components: [row],
        });
    }
};

module.exports = {
	UserCommand
};
