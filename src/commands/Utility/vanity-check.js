const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Check to see if a vanity url is already taken or not"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('vanity-check')
				.setDescription(this.description)
                .addStringOption((option) => option
                    .setName('vanity')
                    .setDescription('The vanity to check')
                    .setRequired(true)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const { options } = interaction;
        const vanity = options.getString('vanity');

        async function sendMessage(message, send) {
            const embed = new EmbedBuilder()
            .setColor(color.default)
            .setDescription(message);

            if (send) {
                await interaction.reply({ content: `discord.gg/${vanity}`, embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }

        var invite = await interaction.client.fetchInvite(vanity).catch(err => {});

        var nInviteMsg = `${emojis.custom.info} \`-\` The vanity invite \`${vanity}\` is **NOT** taken by a server!`;

        if (!invite) {
            await sendMessage(nInviteMsg);
        } else {
            if (!invite.guild || !invite.guild.vanityURLCode || invite.guild.vanityURLCode !== vanity)
            return await sendMessage(nInviteMsg);

            await sendMessage(`${emojis.custom.warning} Looks like the vanity \`${vanity}\` is taken by: \`discord.gg/${vanity}\` \n\n${emojis.custom.compass} \`-\` **${invite.guild.name}'s Features:** \n> \n ${emojis.custom.person} \`-\` **Member Count:**\n ${emojis.custom.arrowright} **${invite.memberCount}** \n${emojis.custom.community} \`-\` **Server ID:**\n ${emojis.custom.arrowright} \`${invite.guild.id}\` \n${emojis.custom.pencil} \`-\` **Server Description:**\n ${emojis.custom.arrowright} **${invite.guild.description??`None`}** \n\nThis server holds the invite \`${vanity}\` meaning it is **NOT** usable by anyone else.`, true);
        }
    }
}

module.exports = {
	UserCommand
};


