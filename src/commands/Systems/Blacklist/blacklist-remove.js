const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config');
const Guild = require('../../../lib/schemas/blacklistSchema');
const { EmbedBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
    /**
     * @param {CadiaCommand.Context} context
     * @param {CadiaCommand.Options} options
     */
    constructor(context, options) {
        super(context, {
            ...options,
            permissionLevel: PermissionLevels.BotOwner,
            description: "Unblacklist a server, allowing them to use Cadia Bot"
        });
    }

    /**
     * @param {CadiaCommand.Registry} registry
     */
    registerApplicationCommands(registry) {
        registry.registerChatInputCommand(builder =>
            builder //
                .setName('blacklist-remove')
                .setDescription(this.description)
                .addStringOption(option =>
                    option.setName('server-id')
                        .setDescription('The ID of the server to be unblacklisted')
                        .setRequired(true))
        );
    }

    /**
     * @param {CadiaCommand.ChatInputCommandInteraction} interaction
     */
    async chatInputRun(interaction) {
        try {
            const guildIdToRemove = interaction.options.getString('server-id');
            const removedGuild = await Guild.findOneAndDelete({ guildId: guildIdToRemove });

            if (!removedGuild) {
                const embed = new EmbedBuilder()
                    .setColor(color.fail)
                    .setDescription(`${emojis.custom.fail} This server has **not** been **found** in the database!`);

                return await interaction.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(color.success)
                .setDescription(`${emojis.custom.success} The server with ID \`${removedGuild.guildId}\` has been **removed** from the database!`);

            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error(error);

            const errorEmbed = new EmbedBuilder()
            .setColor(color.fail)
            .setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/26R7kXa6dx) for assistance or use </bugreport:1219050295770742934>*`)
            .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }
    }
}

module.exports = {
    UserCommand
};
