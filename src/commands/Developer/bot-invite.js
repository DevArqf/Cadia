const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const axios = require('axios');
const { EmbedBuilder, OAuth2Scopes , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Get an invite link to invite me to your server"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('invite')
				.setDescription(this.description)
                .addStringOption((option) => option
                    .setName('permissions')
                    .setDescription('The permissions you want to add to the bot (presets)')
                    .addChoices(
                            { name: `View Server (No moderation perms)`, value: `517547088960`},
                            { name: `Basic Moderation (Manage messages, roles and emojis)`, value: `545195949136`},
                            { name: `Advanced Moderation (Manage server)`, value: `545195949174`},
                            { name: `Administrator (Every permission)`, value: `8`},
                        )
                    .setRequired(true))
		        );
	        }

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		
        const { options } = interaction;
        const perms = options.getString('permissions');

        const link = interaction.client.generateInvite({
            scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
            permissions: [
                perms
            ],
        });

        const embed = new EmbedBuilder()
        .setColor(color.success)

        if (perms !== '8') embed.setDescription(`${emojis.custom.success} The invite link has been **successfully** generated using your selected choice! To **view** the specific **permissions**, click on the invite and continue with a selected server. \n \n${emojis.custom.warning} This bot **may** require **__Administrator Permissions__** to fully function! By not selecting the highest permissions for your server, you **__risk__** not being able to use all of the features. \n \n> ${link}`)
        else embed.setDescription(`${emojis.custom.success} The invite link has been **successfully** generated using your selected choice! To **view** the specific **permissions**, click on the invite link and continue with a selected server. \n \n> ${link}`)

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	}
};

module.exports = {
	UserCommand
};