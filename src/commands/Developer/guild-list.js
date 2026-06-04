const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder , MessageFlags} = require('discord.js');
const sourcebin = require('sourcebin_js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Shows all of the servers Cadia is in (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('guild-list')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		let list = '';
		interaction.client.guilds.cache.forEach((guild) => {
			list += `${guild.name} (${guild.id}) | ${guild.memberCount} Members | Owner: ${guild.ownerId}\n`;
		});

		sourcebin
			.create([
				{
					name: `Cadia Guild List - Code By Cadia`,
					content: list,
					languageId: 'js'
				}
			])
			.then((src) => {
				const embed = new EmbedBuilder()
					.setDescription(
						`${emojis.custom.success} The Guild List has been **successfully** generated!\n⠀${emojis.custom.arrowright} [Click here to view](${src.url})`
					)
					.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
					.setColor(color.success)
					.setTimestamp();

				interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
			});
	}
}

module.exports = {
	UserCommand
};
