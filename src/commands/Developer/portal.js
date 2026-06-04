const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder, ChannelType , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Generate an invite link to a server (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('portal')
				.setDescription(this.description)
				.addStringOption((option) =>
					option.setName('server_id').setDescription('The ID of the server to generate the invite for.').setRequired(true)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		// Extracting the server ID from the interaction options
		const serverId = interaction.options.getString('server_id');

		// Getting the guild object from the cache using the provided server ID
		const guild = interaction.client.guilds.cache.get(serverId);

		// If the guild exists
		if (guild) {
			// Generating an invite for the guild
			const invite = await guild.channels.cache
				.filter((channel) => channel.type !== ChannelType.GuildCategory)
				.first()
				.createInvite({
					maxAge: 84600, // Invite link expiration time in seconds (24 hours)
					maxUses: 0, // Maximum number of times the invite can be used (unlimited)
					unique: false // Whether the invite link should be unique or not
				});

			// Reply to the interaction with a message containing the URL of the source bin
			const embed = new EmbedBuilder()
				.setDescription(
					`${emojis.custom.success} ${interaction.user} The server link has been **successfully** created!\n⠀${emojis.custom.arrowright} [Click here to join](https://discord.gg/${invite.code})`
				)
				.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
				.setColor(color.success)
				.setTimestamp();

			interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		} else {
			// Sending an error message if the guild could not be found in the cache
			console.error(error);
			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
				.setTimestamp();

			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
			return;
		}
	}
}

module.exports = {
	UserCommand
};
