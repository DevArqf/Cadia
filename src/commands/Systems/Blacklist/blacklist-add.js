const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { branding, color, emojis, channels } = require('../../../config');
const Guild = require('../../../lib/schemas/blacklistSchema');
const { cacheGuildBlacklist } = require('../../../lib/policies/blacklist');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Blacklist a server, restricting them from using Cadia'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('blacklist-add')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('server-id').setDescription('The ID of the server to be blacklist').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for blacklisting'))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const reason = interaction.options.getString('reason') || 'No reason provided';
			const guildId = interaction.options.getString('server-id');
			const logChannelId = channels.blacklistLogging;
			const logChannel = interaction.client.channels.cache.get(logChannelId);

			if (!/^\d{17,20}$/.test(guildId)) {
				return interaction.reply({
					embeds: [new EmbedBuilder().setColor(color.invis).setDescription(`${emojis.custom.fail} Enter a valid Discord server ID.`)],
					flags: MessageFlags.Ephemeral
				});
			}

			const existingGuild = await Guild.findOne({ guildId });

			if (existingGuild !== null) {
				return interaction.reply({
					embeds: [new EmbedBuilder().setColor(color.invis).setDescription(`${emojis.custom.fail} This server is already blacklisted.`)],
					flags: MessageFlags.Ephemeral
				});
			}

			const targetGuild = interaction.client.guilds.cache.get(guildId);

			if (!targetGuild) {
				const createdGuild = await Guild.create({
					guildName: 'No name found in the database',
					guildId,
					reason: `${reason}, Bot not in guild`
				});
				cacheGuildBlacklist(createdGuild);

				const logEmbed1 = new EmbedBuilder()
					.setColor(`${color.random}`)
					.setDescription(`${emojis.custom.ban} The server has been **blacklisted**`)
					.addFields(
						{
							name: `${emojis.custom.settings} \`-\` **Server Name:**`,
							value: `${emojis.custom.arrowright} **The server name could not be found in the database**`,
							inline: false
						},
						{
							name: `${emojis.custom.pencil} \`-\` **Server ID:**`,
							value: `${emojis.custom.arrowright} **${guildId}**`,
							inline: false
						},
						{
							name: `${emojis.custom.crown} \`-\` **Owner ID:**`,
							value: `${emojis.custom.arrowright} **The owner ID could not be found in the database**`,
							inline: false
						},
						{
							name: `${emojis.custom.mail} \`-\` **Reason:**`,
							value: `${emojis.custom.arrowright} **${reason}, Cadia is not within the server**`,
							inline: false
						},
						{
							name: `${emojis.custom.person} \`-\` **Moderator:**`,
							value: `${emojis.custom.arrowright} ${interaction.user.displayName}`,
							inline: false
						}
					)
					.setFooter({ text: `Actioned by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
					.setTimestamp();

				await logChannel?.send({ embeds: [logEmbed1] });

				return interaction.reply(
					`${emojis.custom.warning} The server with the ID \`${guildId}\` has been **blacklisted**!\n\n${emojis.custom.mail} \`-\` **Reason:**\n${emojis.custom.arrowright} **${reason}, Cadia is not within the server**`
				);
			}

			const embed = new EmbedBuilder()
				.setColor(color.default)
				.setDescription(
					`${emojis.custom.warning} Your server has been **blacklisted** from using **${interaction.client.user.displayName}**!`
				)
				.addFields(
					{
						name: `${emojis.custom.settings} \`-\` **Server Name:**`,
						value: `${emojis.custom.arrowright} **${targetGuild.name}**`,
						inline: false
					},
					{
						name: `${emojis.custom.mail} \`-\` **Reason:**`,
						value: `${emojis.custom.arrowright} **${reason}**`,
						inline: false
					},
					{
						name: `${emojis.custom.settings} \`-\` **Blacklisted By:**`,
						value: `${emojis.custom.arrowright} **${interaction.user.displayName}**`,
						inline: false
					}
				)
				.setFooter({ text: `Your server has been blacklisted` })
				.setTimestamp();

			const ownerId = targetGuild.ownerId; // Get the owner ID
			const guildName = targetGuild.name;

			const logEmbed2 = new EmbedBuilder()
				.setColor(`${color.random}`)
				.setDescription(`${emojis.custom.ban} The server has been **blacklisted**`)
				.addFields(
					{
						name: `${emojis.custom.settings} \`-\` **Server Name:**`,
						value: `${emojis.custom.arrowright} **${guildName}**`,
						inline: false
					},
					{
						name: `${emojis.custom.pencil} \`-\` **Server ID**`,
						value: `${emojis.custom.arrowright} **${targetGuild.id}**`,
						inline: false
					},
					{
						name: `${emojis.custom.crown} \`-\` **Owner ID:**`,
						value: `${emojis.custom.arrowright} ${ownerId}`,
						inline: false
					},
					{
						name: `${emojis.custom.mail} \`-\` **Reason**`,
						value: `${emojis.custom.arrowright} **${reason}**`,
						inline: false
					}
				)
				.setFooter({ text: `Actioned by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
				.setTimestamp();

			await logChannel?.send({ embeds: [logEmbed2] });

			const createdGuild = await Guild.create({ guildName: targetGuild.name, guildId: targetGuild.id, reason });
			cacheGuildBlacklist(createdGuild);

			const owner = await targetGuild.fetchOwner().catch(() => null);
			await owner?.send({ embeds: [embed] }).catch(() => null);

			await interaction.reply(
				`${emojis.custom.warning} The server with the ID \`${targetGuild.id}\` has been **blacklisted**!\n\n${emojis.custom.mail} \`-\` **Reason:**\n${emojis.custom.arrowright} \`${reason}\``
			);
		} catch (error) {
			console.error(error);
			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(
					`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](${branding.supportServerUrl}) for assistance or use </bugreport:${branding.bugReportCommandId}>*`
				)
				.setTimestamp();

			if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [errorEmbed] });
			else await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
			return;
		}
	}
}

module.exports = {
	UserCommand
};
