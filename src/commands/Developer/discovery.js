const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { ChannelType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { componentReply, linkButton, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Discover every server Cadia is in (DEV ONLY)'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('discovery').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });

		try {
			await interaction.editReply(componentReply(loadingPanel('Fetching the server cache...'), true));
			await interaction.client.guilds.fetch();

			const guilds = [...interaction.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);
			const rows = [];

			await interaction.editReply(componentReply(loadingPanel(`Found ${guilds.length} servers. Creating invite links...`), true));

			for (const [index, guild] of guilds.entries()) {
				if (index === 0 || (index + 1) % 5 === 0 || index + 1 === guilds.length) {
					await interaction.editReply(componentReply(loadingPanel(`Reading server details ${index + 1}/${guilds.length}`), true));
				}

				const invite = await createGuildInvite(guild);
				const joinedAt = await getBotJoinDate(guild);
				rows.push({
					guild,
					invite,
					line: `${emojis.custom.arrowright} **${escapeMarkdown(guild.name)}**\nID: \`${guild.id}\` - Members: **${(guild.memberCount ?? 0).toLocaleString()}** - Owner: <@${guild.ownerId}> - Joined: **${joinedAt}**`
				});
			}

			const chunks = chunkLines(rows.map((row) => row.line));
			const firstInvite = rows.find((row) => row.invite)?.invite?.url;
			const containers = chunks.slice(0, 5).map((description, index) =>
				panel({
					accentColor: color.default,
					title: `${emojis.custom.compass} **Cadia Server Discovery${index ? ` (${index + 1})` : ''}**`,
					subtitle: `${guilds.length.toLocaleString()} servers indexed`,
					sections: [description],
					footer: `${emojis.custom.person} Requested by ${interaction.user.displayName}`,
					buttons: index === 0 && firstInvite ? [linkButton('Open First Invite', firstInvite)] : []
				})
			);

			return interaction.editReply(componentReply(containers, true));
		} catch (error) {
			console.error(error);
			return interaction.editReply(
				componentReply(notice(`${emojis.custom.fail} **Discovery Failed**`, 'I was unable to generate the server discovery list.'), true)
			);
		}
	}
}

function loadingPanel(message) {
	return panel({
		accentColor: color.default,
		title: `${emojis.custom.loading} **Discovery Running**`,
		sections: [`${emojis.custom.arrowright} ${message}`],
		footer: false
	});
}

async function createGuildInvite(guild) {
	const channels = guild.channels.cache
		.filter((channel) => channel.type !== ChannelType.GuildCategory && typeof channel.createInvite === 'function')
		.sort((a, b) => a.rawPosition - b.rawPosition)
		.values();

	for (const channel of channels) {
		const permissions = channel.permissionsFor(guild.members.me);
		if (!permissions?.has(PermissionFlagsBits.CreateInstantInvite)) continue;

		const invite = await channel
			.createInvite({
				maxAge: 86400,
				maxUses: 0,
				unique: false,
				reason: 'Developer discovery command'
			})
			.catch(() => null);
		if (invite) return invite;
	}

	return null;
}

async function getBotJoinDate(guild) {
	const member = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
	if (!member?.joinedAt) return 'Unknown';

	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(member.joinedAt);
}

function chunkLines(lines) {
	const chunks = [];
	let current = '';

	for (const line of lines) {
		if (current.length + line.length + 2 > 3500) {
			chunks.push(current);
			current = '';
		}
		current += `${line}\n\n`;
	}

	if (current) chunks.push(current);
	return chunks;
}

function escapeMarkdown(text) {
	return text.replace(/([\\[\]])/g, '\\$1');
}

module.exports = {
	UserCommand
};
