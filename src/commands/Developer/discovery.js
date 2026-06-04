const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Discover every server Cadia is in (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('discovery')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			await interaction.editReply({ embeds: [createLoadingEmbed('Fetching the server cache...')] });
			await interaction.client.guilds.fetch();

			const lines = [];
			const guilds = [...interaction.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);

			await interaction.editReply({
				embeds: [createLoadingEmbed(`Found ${guilds.length} servers. Creating invite links and reading join dates...`)]
			});

			for (const [index, guild] of guilds.entries()) {
				if (index === 0 || (index + 1) % 5 === 0 || index + 1 === guilds.length) {
					await interaction.editReply({
						embeds: [createLoadingEmbed(`Retrieving server details... ${index + 1}/${guilds.length}`)]
					});
				}

				const invite = await createGuildInvite(guild);
				const joinedAt = await getBotJoinDate(guild);
				const guildName = escapeMarkdown(guild.name);
				const linkedName = invite ? `[${guildName}](${invite.url})` : `**${guildName}**`;

				lines.push(
					`${emojis.custom.arrowright} ${linkedName}\n> ID: \`${guild.id}\` | Members: **${guild.memberCount}** | Owner: <@${guild.ownerId}> | Joined: **${joinedAt}**`
				);
			}

			await interaction.editReply({ embeds: [createLoadingEmbed('Building the discovery list...')] });

			const embeds = chunkLines(lines).map((description, index) =>
				new EmbedBuilder()
					.setColor(color.default)
					.setTitle(index === 0 ? 'Cadia Server Discovery' : `Cadia Server Discovery (${index + 1})`)
					.setDescription(description)
					.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
					.setTimestamp()
			);

			return interaction.editReply({ embeds });
		} catch (error) {
			console.error(error);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} Oopsie, I was unable to generate the server discovery list.`)
				.setTimestamp();

			return interaction.editReply({ embeds: [errorEmbed] });
		}
	}
}

function createLoadingEmbed(message) {
	return new EmbedBuilder().setColor(color.default).setDescription(`${emojis.custom.loading} ${message}`).setTimestamp();
}

async function createGuildInvite(guild) {
	const channels = guild.channels.cache
		.filter((channel) => channel.type !== ChannelType.GuildCategory && typeof channel.createInvite === 'function')
		.sort((a, b) => a.rawPosition - b.rawPosition)
		.values();

	for (const channel of channels) {
		const permissions = channel.permissionsFor(guild.members.me);
		if (!permissions?.has(PermissionFlagsBits.CreateInstantInvite)) continue;

		try {
			return await channel.createInvite({
				maxAge: 86400,
				maxUses: 0,
				unique: false,
				reason: 'Developer discovery command'
			});
		} catch {
			continue;
		}
	}

	return null;
}

async function getBotJoinDate(guild) {
	const member = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
	if (!member?.joinedAt) return 'Unknown';

	return formatExactDate(member.joinedAt);
}

function formatExactDate(date) {
	return `${new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).format(date)} Caracas`;
}

function chunkLines(lines) {
	const chunks = [];
	let current = '';

	for (const line of lines) {
		if (current.length + line.length + 2 > 3900) {
			chunks.push(current);
			current = '';
		}

		current += `${line}\n\n`;
	}

	if (current) chunks.push(current);
	return chunks.slice(0, 10);
}

function escapeMarkdown(text) {
	return text.replace(/([\\[\]])/g, '\\$1');
}

module.exports = {
	UserCommand
};
