const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config')
const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const { WelcomeSchema } = require('../../../lib/schemas/welcomeSchema');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
            name: 'welcome',
			description: 'Setup an automatic Welcome System witgin your server',
            requiredUserPermissions: ['ManageGuild']
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)

                //Setup Subcommand
                .addSubcommand((subcommand) =>
					subcommand //
						.setName('setup')
						.setDescription('Setup a Welcome System within your server')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Specified channel to send the welcome message to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption((option) =>
                        option
                            .setName('type')
                            .setDescription('The type of message')
                            .addChoices(
                                { name: 'Regular', value: 'regular' },
                                { name: 'Embed', value: 'embed' },
                            )
                            .setRequired(true))
                .addStringOption((option) =>
                        option
                            .setName('message')
                            .setDescription('Specified message will be sent as a Welcome within the embed')
                            .setRequired(true))
                .addStringOption((option) =>
                    option
                        .setName('embed-title')
                        .setDescription('The title of the embed')
                        .setRequired(false))
                        
                .addStringOption((option) =>
                    option
                        .setName('embed-hex')
                        .setDescription('The HEX code of the embed')
                        .setRequired(false)) 
                .addStringOption((option) =>
                    option
                        .setName('embed-footer')
                        .setDescription('The footer of the embed')
                        .setRequired(false))
                .addStringOption((option) =>
                    option
                        .setName('embed-thumbnailurl')
                        .setDescription('The thumbnail URL for the embed')
                        .setRequired(false))
                .addStringOption((option) =>
                    option
                        .setName('embed-authorname')
                        .setDescription('The author message or name of the embed')
                        .setRequired(false))
                .addStringOption((option) =>
                    option
                        .setName('embed-iconurl')
                        .setDescription('The icon URL of the embed')
                        .setRequired(false))
                )

                // Disable SubCommand
                .addSubcommand((subcommand) =>
                        subcommand 
                            .setName('disable')
                            .setDescription('Disable the Welcome System within your server'))
                // Vars SubCommand
                .addSubcommand((subcommand) => 
                        subcommand
                            .setName('vars')
                            .setDescription('Receive a list of Variables that you can use for your Welcome message')),
                 
        );
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const channelID = interaction.options.getChannel('channel').id;
            const messageType = interaction.options.getString('type');
            const message = interaction.options.getString('message');
            const find = await WelcomeSchema.findOne({ guildId: interaction.guild.id });

            if (find) {
                    return await interaction.reply(`${emojis.custom.fail} The Welcome System has **already** been **setup** within the server!`);
            } else {

            // await WelcomeSchema.create({ guildId: interaction.guild.id, welcomeChannelId: channelID, messageType: messageType, messageInfo: { title: null, message: null, footer: null, hexCode: null} });

            if (messageType === 'regular') {
                await WelcomeSchema.create({ guildId: interaction.guild.id, welcomeChannelId: channelID, messageType: messageType, message: ' ', title: null, footer: null, thumbnailImage: null, authorName: null, iconURL: null, hexCode: null });
                await WelcomeSchema.findOneAndUpdate({ guildId: interaction.guild.id }, { title: null, message: message, footer: null, thumbnailImage: null, authorName: null, iconURL: null, hexCode: null }, { upsert: false });
                return SendMessage(interaction);
            } else {
                const title = interaction.options.getString('embed-title');
                const footer = interaction.options.getString('embed-footer');
                const hexCode = interaction.options.getString('embed-hex');
                const authorName = interaction.options.getString('embed-authorname');
                const thumbnailURLBefore = interaction.options.getString('embed-thumbnailurl');
                const iconURLBefore = interaction.options.getString('embed-iconurl');

                let iconURL = '';
                let thumbnailURL ='';
                if (iconURL) {
                    if (iconURLBefore.includes('{serverIcon}')) {
                        const guildIcon = await interaction.guild.iconURL({ dynamic: true, size: 2048 });
                        iconURL += guildIcon
                    } else {
                        iconURL =+ iconURLBefore
                    };

                    if (!iconURL.startsWith('https://') && !iconURL.startsWith('http://')) {
                        const iconURLError = new EmbedBuilder()
                        .setColor(color.fail)
                        .setDescription(`${emojis.custom.fail} Your Input is **not** an **URL**. Please make sure your **URL** starts with "**https://**" or "**http://*"`)
                        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })

                        return await interaction.reply({ embeds: [iconURLError] });
                    }
                };

                if (thumbnailURL) {
                    if (thumbnailURLBefore.includes('{serverIcon}')) {
                        const guildIcon = await interaction.guild.iconURL({ dynamic: true, size: 2048 });
                        thumbnailURL += guildIcon
                    } else {
                        thumbnailURL += thumbnailURLBefore;
                    };


                    if (!thumbnailURL.startsWith('https://') && !thumbnailURL.startsWith('http://')) {
                        const thumbnailError = new EmbedBuilder()
                        .setColor(color.fail)
                        .setDescription(`${emojis.custom.fail} Your Input is **not** an **URL**. Please make sure your **URL** starts with "**https://**" or "**http://*"`)
                        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })

                        return await interaction.reply({ embeds: [thumbnailError] });
                    }
                };

                if (hexCode) {
                    if (!typeof !hexCode.length === 6 && !hexCode.startsWith('#')) {
                        const hexError = new EmbedBuilder()
                        .setColor(color.fail)
                        .setDescription(`${emojis.custom.fail} Your Input is **not** a valid **HEX Code**. Please make sure your **HEX Code** starts with "**#**" or includes **6** numbers!`)
                        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })

                        return await interaction.reply({ embeds: [hexError] });
                    }
                };

                await WelcomeSchema.create({ guildId: interaction.guild.id, welcomeChannelId: channelID, messageType: messageType, message: ' ', title: null, footer: null, thumbnailImage: null, authorName: null, iconURL: null, hexCode: null });

                await WelcomeSchema.findOneAndUpdate({ guildId: interaction.guild.id }, { title: title, message: message, footer: footer, thumbnailImage: thumbnailURL, authorName: authorName, iconURL: iconURL, hexCode: hexCode }, { upsert: false });
                return SendMessage(interaction);
            }


            async function SendMessage(interaction) {
            const CreatedEmbed = new EmbedBuilder()
                .setColor(`${color.default}`)
                .setDescription(`${emojis.custom.success} The **Welcome System** has been setup!\n\n ${emojis.custom.pencil} \`-\` **Channel:**\n ${emojis.custom.arrowright} <#${channelID}>`)
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });

            return await interaction.reply({ embeds: [CreatedEmbed] })
           }
        }      
     };

        if (subcommand === 'disable') {
            const find = await WelcomeSchema.find({ guildId: interaction.guild.id });
		
            if (find.length === 0) {
                const cantDisable = new EmbedBuilder()
                .setColor(color.fail)
                .setDescription(`${emojis.custom.fail} I **cannot** disable the **Welcome System** as it has **not** been setup within the server!`)
                return await interaction.reply({ embeds: [cantDisable] });
            } else {
                await WelcomeSchema.deleteOne({ guildId: interaction.guild.id });
                const Deleted = new EmbedBuilder()
                    .setColor(color.default)
                    .setDescription(`${emojis.custom.success} The **Welcome System** has been **disabled** within the server!`)
                return await interaction.reply({ embeds: [Deleted] });
            };
        };

        if (subcommand === 'vars') {
            const embed = new EmbedBuilder()
                .setColor(color.default)
                .setTitle('`📜` Welcome System Variables `📜`')
                .addFields([
                    { name: '**Title:**', value: `${emojis.custom.arrowright} \`{userId}\` Get the users **ID**\n${emojis.custom.arrowright} \`{serverName}\` Get the servers name\n${emojis.custom.arrowright} \`{serverMembers}\` Get the total member count of the server` },
                    { name: '**Message:**', value: `${emojis.custom.arrowright} \`{userId}\` Get the users **ID**\n${emojis.custom.arrowright} \`{userMention}\` Mention the user who joined\n${emojis.custom.arrowright} \`{serverName}\` Get the servers name\n${emojis.custom.arrowright} \`{serverMembers}\` Get the total member count of the server\n${emojis.custom.arrowright} \`\\n\` Use this to make a new line in a message` },
                    { name: '**Footer:**', value: `${emojis.custom.arrowright} \`{userId}\` Get the users name\n${emojis.custom.arrowright} \`{serverName}\` Get the servers name\n${emojis.custom.arrowright} \`{serverMembers}\` Get the total member count of the server` },
                    { name: '**Url\'s:**', value: `${emojis.custom.arrowright} \`{serverIcon}\` Get the icon of the server.` }
                ])
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [embed] });
           }
        }
     };

module.exports = {
	UserCommand
};
