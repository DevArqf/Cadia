const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits
} = require('discord.js');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../lib/runtime/interactionSessions');

const DISCOVERY_PAGE_LIMIT = 3800;
const PAGINATION_TIMEOUT = 300_000;

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
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			await interaction.editReply({ embeds: [loadingEmbed('Fetching the server cache...')], components: [] });
			await interaction.client.guilds.fetch();

			const guilds = [...interaction.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);
			const totalMembers = guilds.reduce((total, guild) => total + (guild.memberCount ?? 0), 0);
			const rows = [];

			await interaction.editReply({
				embeds: [loadingEmbed(`Found ${guilds.length.toLocaleString()} servers. Creating invite links...`)],
				components: []
			});

			for (const [index, guild] of guilds.entries()) {
				if (index === 0 || (index + 1) % 5 === 0 || index + 1 === guilds.length) {
					await interaction.editReply({
						embeds: [loadingEmbed(`Reading server details ${index + 1}/${guilds.length}`)],
						components: []
					});
				}

				const invite = await createGuildInvite(guild);
				const joinedAt = await getBotJoinDate(guild);

				rows.push({
					guild,
					invite,
					line: createGuildLine(guild, invite, joinedAt)
				});
			}

			const pages = chunkLines(
				rows.map((row) => row.line),
				DISCOVERY_PAGE_LIMIT
			);
			const firstInvite = rows.find((row) => row.invite)?.invite?.url ?? null;
			const paginationId = interaction.id;
			let pageIndex = 0;
			const discoveryState = {
				firstInvite,
				guildCount: guilds.length,
				pageIndex,
				pages,
				requesterTag: interaction.user.tag,
				totalMembers
			};

			const reply = await interaction.editReply({
				embeds: [
					discoveryEmbed({
						interaction,
						guildCount: discoveryState.guildCount,
						totalMembers: discoveryState.totalMembers,
						pages,
						pageIndex
					})
				],
				components: [paginationRow(pageIndex, pages.length, firstInvite, paginationId)]
			});
			await saveInteractionSession({
				kind: 'discovery',
				sessionId: paginationId,
				ownerId: interaction.user.id,
				guildId: interaction.guildId || interaction.guild?.id || null,
				channelId: interaction.channelId || interaction.channel?.id || null,
				messageId: reply?.id || null,
				state: discoveryState,
				ttlMs: PAGINATION_TIMEOUT
			});
		} catch (error) {
			console.error(error);

			return interaction.editReply({
				embeds: [failureEmbed()],
				components: []
			});
		}
	}
}

async function handleDiscoveryInteraction(buttonInteraction) {
	if (!buttonInteraction.isButton?.() || !buttonInteraction.customId?.startsWith('discovery:')) return false;
	const [, sessionId, action] = buttonInteraction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: buttonInteraction.message?.id });
	if (!session) {
		await buttonInteraction.reply({ content: `${emojis.custom.clock} Discovery panel expired.`, flags: MessageFlags.Ephemeral });
		return true;
	}
	if (buttonInteraction.user.id !== session.ownerId) {
		await buttonInteraction.reply({ content: `${emojis.custom.forbidden} This discovery panel belongs to another developer.`, flags: MessageFlags.Ephemeral });
		return true;
	}

	if (action === 'close') {
		await buttonInteraction.update({ embeds: [closedEmbed()], components: [] });
		return true;
	}

	const state = { ...(session.state || {}) };
	const pages = Array.isArray(state.pages) ? state.pages : [`${emojis.custom.warning} No server data was found.`];
	let pageIndex = Number(state.pageIndex || 0);
	if (action === 'previous') pageIndex = Math.max(pageIndex - 1, 0);
	if (action === 'next') pageIndex = Math.min(pageIndex + 1, pages.length - 1);
	state.pageIndex = pageIndex;

	await updateInteractionSession(session.sessionId, {
		kind: 'discovery',
		ownerId: session.ownerId,
		guildId: buttonInteraction.guildId || buttonInteraction.guild?.id || session.guildId || null,
		channelId: buttonInteraction.channelId || buttonInteraction.channel?.id || session.channelId || null,
		messageId: buttonInteraction.message?.id || session.messageId || null,
		state,
		ttlMs: PAGINATION_TIMEOUT
	});

	await buttonInteraction.update({
		embeds: [
			discoveryEmbed({
				interaction: buttonInteraction,
				guildCount: state.guildCount,
				requesterTag: state.requesterTag,
				totalMembers: state.totalMembers,
				pages,
				pageIndex
			})
		],
		components: [paginationRow(pageIndex, pages.length, state.firstInvite, session.sessionId)]
	});
	return true;
}

function loadingEmbed(message) {
	return new EmbedBuilder()
		.setColor(color.default)
		.setDescription(`${emojis.custom.loading} **Discovery Running**\n${emojis.custom.arrowright} ${message}`)
		.setTimestamp();
}

function discoveryEmbed({ interaction, guilds, guildCount, requesterTag, totalMembers, pages, pageIndex }) {
	const serverCount = guildCount ?? guilds?.length ?? 0;
	return new EmbedBuilder()
		.setColor(color.default)
		.setTitle(`${emojis.custom.compass} Cadia Server Discovery`)
		.setDescription(pages[pageIndex] ?? `${emojis.custom.warning} No server data was found.`)
		.addFields(
			{
				name: `${emojis.custom.community} Servers`,
				value: `**${serverCount.toLocaleString()}**`,
				inline: true
			},
			{
				name: `${emojis.custom.person} Users`,
				value: `**${totalMembers.toLocaleString()}**`,
				inline: true
			},
			{
				name: `${emojis.custom.openfolder} Page`,
				value: `**${pageIndex + 1}/${pages.length}**`,
				inline: true
			}
		)
		.setFooter({ text: `Requested by ${requesterTag || interaction.user.tag}` })
		.setTimestamp();
}

function closedEmbed() {
	return new EmbedBuilder()
		.setColor(color.default)
		.setDescription(`${emojis.custom.trash} **Discovery Closed**\n${emojis.custom.arrowright} This discovery panel has been closed.`)
		.setTimestamp();
}

function failureEmbed() {
	return new EmbedBuilder()
		.setColor(color.fail ?? color.default)
		.setDescription(`${emojis.custom.fail} **Discovery Failed**\n${emojis.custom.arrowright} I was unable to generate the server discovery list.`)
		.setTimestamp();
}

function paginationRow(pageIndex, pageCount, firstInvite, paginationId, disabled = false) {
	const buttons = [
		new ButtonBuilder()
			.setCustomId(`discovery:${paginationId}:previous`)
			.setEmoji(emojis.custom.left)
			.setLabel('Previous')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(disabled || pageIndex <= 0),

		new ButtonBuilder()
			.setCustomId(`discovery:${paginationId}:next`)
			.setEmoji(emojis.custom.right)
			.setLabel('Next')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(disabled || pageIndex >= pageCount - 1)
	];

	if (firstInvite) {
		buttons.push(new ButtonBuilder().setEmoji(emojis.custom.link).setLabel('Open First Invite').setURL(firstInvite).setStyle(ButtonStyle.Link));
	}

	buttons.push(
		new ButtonBuilder()
			.setCustomId(`discovery:${paginationId}:close`)
			.setEmoji(emojis.custom.trash)
			.setLabel('Close')
			.setStyle(ButtonStyle.Danger)
			.setDisabled(disabled)
	);

	return new ActionRowBuilder().addComponents(buttons);
}

function createGuildLine(guild, invite, joinedAt) {
	const memberCount = (guild.memberCount ?? 0).toLocaleString();
	const inviteText = invite?.url ? `[Open Invite](${invite.url})` : '**Unavailable**';

	return (
		`${emojis.custom.arrowright} **${escapeMarkdown(guild.name)}**\n` +
		`${emojis.custom.info} ID: \`${guild.id}\` - ${emojis.custom.community} Members: **${memberCount}** - ${emojis.custom.crown} Owner: <@${guild.ownerId}>\n` +
		`${emojis.custom.calendar} Joined: **${joinedAt}** - ${emojis.custom.link} Invite: ${inviteText}`
	);
}

async function createGuildInvite(guild) {
	const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
	if (!me) return null;

	const channels = guild.channels.cache
		.filter((channel) => channel.type !== ChannelType.GuildCategory && typeof channel.createInvite === 'function')
		.sort((a, b) => a.rawPosition - b.rawPosition)
		.values();

	for (const channel of channels) {
		const permissions = channel.permissionsFor(me);
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

function chunkLines(lines, maxLength = DISCOVERY_PAGE_LIMIT) {
	if (!lines.length) return [`${emojis.custom.warning} No servers were found.`];

	const chunks = [];
	let current = '';

	for (const line of lines) {
		const next = current ? `${current}\n\n${line}` : line;

		if (next.length > maxLength) {
			if (current) chunks.push(current);
			current = line;
			continue;
		}

		current = next;
	}

	if (current) chunks.push(current);

	return chunks;
}

function escapeMarkdown(text = '') {
	return text.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

module.exports = {
	handleDiscoveryInteraction,
	UserCommand
};
