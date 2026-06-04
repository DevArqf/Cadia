const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder, PermissionsBitField , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
            requiredUserPermissions: ['ManageMessages'],
			description: "Reply to a message from another user"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
            .setName("reply")
            .setDescription(this.description)
            .addStringOption(option => option
                .setName("message-id")
                .setDescription("The message ID of the user")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("text")
                .setDescription("Your reply message")
                .setRequired(true)
            )
            .addBooleanOption(option => option
                .setName("embed")
                .setDescription("Would you want your reply embedded or not?")
                .setRequired(true)
            ),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const msgid = interaction.options.getString("message-id");
        const content = interaction.options.getString("text");
        const boolean = interaction.options.getBoolean("embed")

        const embed1 = new EmbedBuilder()
        .setDescription(`${content}`)
        .setColor(color.default)

        if (msgid.startsWith("http")) {
            return await interaction.reply({
               content: `${emojis.custom.fail} You can **only** use the **message ID**. To **get** the **message ID**, enable the **Discord Developer Mode** in your **Accessibility** settings!`,
               flags: MessageFlags.Ephemeral
            })
        }

        await interaction.reply({
            content: `${emojis.custom.success} I have **successfully** answered to https://ptb.discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${msgid} **|** Content: ${content} **|** Embed: ${boolean}`,
            flags: MessageFlags.Ephemeral
        })

        if (boolean) {
            await interaction.client.channels.cache.get(interaction.channel.id).messages.fetch(msgid).then(message => message.reply({embeds: [embed1]}))
        } else {  
            await interaction.client.channels.cache.get(interaction.channel.id).messages.fetch(msgid).then(message => message.reply({content: `${content}`}))
        }
    }
}

module.exports = {
	UserCommand
};
