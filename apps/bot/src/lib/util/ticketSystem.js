const {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits
} = require('discord.js');
const { color, emojis } = require('../../config');
const { TicketConfigSchema, TicketSchema } = require('../schemas/ticketSchema');

const TICKET_OPEN_ID = 'ticket:open';
const TICKET_CLAIM_ID = 'ticket:claim';
const TICKET_CLOSE_ID = 'ticket:close';

async function getTicketConfig(guildId) {
	let config = await TicketConfigSchema.findOne({ guildId });
	if (!config) config = await TicketConfigSchema.create({ guildId });

	config.maxOpenTickets = Math.max(1, Number(config.maxOpenTickets) || 1);
	config.staffRoleIds = normalizeStaffRoleIds(config);
	config.ticketNameFormat = config.ticketNameFormat || 'ticket-{username}';
	config.title = config.title || 'Need help?';
	config.description = config.description || 'Open a ticket and the support team will help you as soon as possible.';
	return config;
}

async function updateTicketConfig(guildId, patch) {
	const config = await getTicketConfig(guildId);
	const nextPatch = { ...patch };
	if (patch.staffRoleIds) nextPatch.staffRoleIds = normalizeStaffRoleIds(patch);
	Object.assign(config, nextPatch, { updatedAt: Date.now() });
	await config.save();
	return config;
}

async function createTicket(interaction) {
	const config = await getTicketConfig(interaction.guild.id);
	if (!config.enabled) return interaction.reply({ embeds: [failEmbed('The ticket system is not enabled yet.')], flags: MessageFlags.Ephemeral });

	const openTickets = await getOpenTicketsForUser(interaction.guild.id, interaction.user.id);
	if (openTickets.length >= config.maxOpenTickets) {
		const channels = openTickets.map((ticket) => `<#${ticket.channelId}>`).join(', ');
		return interaction.reply({
			embeds: [failEmbed(`You already have ${openTickets.length} open ticket${openTickets.length === 1 ? '' : 's'}: ${channels}`)],
			flags: MessageFlags.Ephemeral
		});
	}

	const ticketNumber = (await TicketSchema.find({ guildId: interaction.guild.id })).length + 1;
	const channelName = formatTicketChannelName(config, interaction.user, ticketNumber);
	const channel = await interaction.guild.channels.create({
		name: channelName,
		type: ChannelType.GuildText,
		parent: config.categoryId || null,
		topic: `Cadia ticket ${ticketNumber} | Owner: ${interaction.user.tag} (${interaction.user.id})`,
		permissionOverwrites: buildTicketPermissionOverwrites(interaction, config)
	});

	const ticket = await TicketSchema.create({
		guildId: interaction.guild.id,
		channelId: channel.id,
		ownerId: interaction.user.id,
		ticketNumber,
		status: 'open',
		participants: [interaction.user.id],
		createdAt: Date.now(),
		updatedAt: Date.now()
	});

	await channel.send({
		content: `${interaction.user}${formatStaffRoleMentions(config.staffRoleIds)}`,
		embeds: [ticketWelcomeEmbed(interaction.user, ticket, config)],
		components: [ticketControlRow(ticket)]
	});

	return interaction.reply({
		embeds: [successEmbed('Ticket Created', `Your ticket has been created in ${channel}.`)],
		flags: MessageFlags.Ephemeral
	});
}

async function claimTicket(interaction) {
	const ticket = await getOpenTicketByChannel(interaction.channelId);
	if (!ticket) return interaction.reply({ embeds: [failEmbed('This channel is not an open ticket.')], flags: MessageFlags.Ephemeral });
	if (!(await canManageTickets(interaction.member, interaction.guild.id))) {
		return interaction.reply({ embeds: [failEmbed('Only ticket staff can claim tickets.')], flags: MessageFlags.Ephemeral });
	}

	ticket.status = 'claimed';
	ticket.claimedById = interaction.user.id;
	ticket.updatedAt = Date.now();
	await ticket.save();

	return interaction.reply({ embeds: [successEmbed('Ticket Claimed', `${interaction.user} has claimed this ticket.`)] });
}

async function closeTicket(interaction, reason = 'No reason provided.') {
	const ticket = await getOpenTicketByChannel(interaction.channelId);
	if (!ticket) return interaction.reply({ embeds: [failEmbed('This channel is not an open ticket.')], flags: MessageFlags.Ephemeral });

	const isOwner = ticket.ownerId === interaction.user.id;
	const isStaff = await canManageTickets(interaction.member, interaction.guild.id);
	if (!isOwner && !isStaff) {
		return interaction.reply({
			embeds: [failEmbed('Only the ticket owner or ticket staff can close this ticket.')],
			flags: MessageFlags.Ephemeral
		});
	}

	await interaction.reply({ embeds: [successEmbed('Closing Ticket', 'Saving transcript and closing this ticket in a few seconds.')] });
	await sendTicketTranscript(interaction, ticket, reason);

	ticket.status = 'closed';
	ticket.closedById = interaction.user.id;
	ticket.closeReason = reason;
	ticket.closedAt = Date.now();
	ticket.updatedAt = Date.now();
	await ticket.save();

	setTimeout(() => interaction.channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason}`).catch(() => null), 5000);
}

async function addTicketUser(interaction, user) {
	const ticket = await getOpenTicketByChannel(interaction.channelId);
	if (!ticket) return interaction.reply({ embeds: [failEmbed('This channel is not an open ticket.')], flags: MessageFlags.Ephemeral });
	if (!(await canManageTickets(interaction.member, interaction.guild.id))) {
		return interaction.reply({ embeds: [failEmbed('Only ticket staff can add users to tickets.')], flags: MessageFlags.Ephemeral });
	}

	await interaction.channel.permissionOverwrites.edit(user.id, {
		ViewChannel: true,
		SendMessages: true,
		ReadMessageHistory: true,
		AttachFiles: true,
		EmbedLinks: true
	});

	ticket.participants = [...new Set([...(ticket.participants || []), user.id])];
	ticket.updatedAt = Date.now();
	await ticket.save();

	return interaction.reply({ embeds: [successEmbed('User Added', `${user} can now view this ticket.`)] });
}

async function removeTicketUser(interaction, user) {
	const ticket = await getOpenTicketByChannel(interaction.channelId);
	if (!ticket) return interaction.reply({ embeds: [failEmbed('This channel is not an open ticket.')], flags: MessageFlags.Ephemeral });
	if (!(await canManageTickets(interaction.member, interaction.guild.id))) {
		return interaction.reply({ embeds: [failEmbed('Only ticket staff can remove users from tickets.')], flags: MessageFlags.Ephemeral });
	}
	if (user.id === ticket.ownerId)
		return interaction.reply({ embeds: [failEmbed('The ticket owner cannot be removed from their own ticket.')], flags: MessageFlags.Ephemeral });

	await interaction.channel.permissionOverwrites.delete(user.id).catch(() => null);
	ticket.participants = (ticket.participants || []).filter((id) => id !== user.id);
	ticket.updatedAt = Date.now();
	await ticket.save();

	return interaction.reply({ embeds: [successEmbed('User Removed', `${user} can no longer view this ticket.`)] });
}

function buildTicketPanel(config) {
	const embed = new EmbedBuilder()
		.setColor(color.default)
		.setTitle(config.title)
		.setDescription(
			[
				config.description,
				'',
				`${emojis.custom.mail} **Open a private ticket** with the support team.`,
				`${emojis.custom.info} **Limit:** ${config.maxOpenTickets} open ticket${config.maxOpenTickets === 1 ? '' : 's'} per member.`
			].join('\n')
		)
		.setFooter({ text: 'Cadia Ticket System' });

	return {
		embeds: [embed],
		components: [
			new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId(TICKET_OPEN_ID).setLabel('Open Ticket').setEmoji(emojis.custom.mail).setStyle(ButtonStyle.Primary)
			)
		]
	};
}

function ticketControlRow(ticket) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(TICKET_CLAIM_ID)
			.setLabel(ticket.claimedById ? 'Claimed' : 'Claim')
			.setEmoji(emojis.custom.person)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(Boolean(ticket.claimedById)),
		new ButtonBuilder().setCustomId(TICKET_CLOSE_ID).setLabel('Close').setEmoji(emojis.custom.lock).setStyle(ButtonStyle.Danger)
	);
}

async function getOpenTicketByChannel(channelId) {
	const ticket = await TicketSchema.findOne({ channelId });
	if (!ticket || ticket.status === 'closed') return null;
	return ticket;
}

async function getOpenTicketsForUser(guildId, ownerId) {
	const tickets = await TicketSchema.find({ guildId, ownerId });
	return tickets.filter((ticket) => ticket.status !== 'closed');
}

async function canManageTickets(member, guildId) {
	if (!member) return false;
	if (member.permissions?.has?.(PermissionFlagsBits.ManageChannels)) return true;

	const config = await getTicketConfig(guildId);
	return config.staffRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function buildTicketPermissionOverwrites(interaction, config) {
	const overwrites = [
		{
			id: interaction.guild.id,
			deny: [PermissionFlagsBits.ViewChannel]
		},
		{
			id: interaction.user.id,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.AttachFiles,
				PermissionFlagsBits.EmbedLinks
			]
		},
		{
			id: interaction.client.user.id,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.ManageChannels,
				PermissionFlagsBits.AttachFiles,
				PermissionFlagsBits.EmbedLinks
			]
		}
	];

	for (const roleId of config.staffRoleIds) {
		overwrites.push({
			id: roleId,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.ManageMessages,
				PermissionFlagsBits.AttachFiles,
				PermissionFlagsBits.EmbedLinks
			]
		});
	}

	return overwrites;
}

function normalizeStaffRoleIds(config = {}) {
	const roleIds = new Set();
	if (config.staffRoleId) roleIds.add(config.staffRoleId);
	for (const roleId of config.staffRoleIds || []) {
		if (roleId) roleIds.add(roleId);
	}

	return [...roleIds];
}

function formatStaffRoleMentions(roleIds = []) {
	if (!roleIds.length) return '';
	return ` ${roleIds.map((roleId) => `<@&${roleId}>`).join(' ')}`;
}

async function sendTicketTranscript(interaction, ticket, reason) {
	const config = await getTicketConfig(interaction.guild.id);
	if (!config.logChannelId) return;

	const logChannel =
		interaction.guild.channels.cache.get(config.logChannelId) || (await interaction.guild.channels.fetch(config.logChannelId).catch(() => null));
	if (!logChannel?.isTextBased?.()) return;

	const transcript = await buildTranscript(interaction.channel);
	const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), {
		name: `ticket-${ticket.ticketNumber}-${ticket.channelId}.txt`
	});

	await logChannel
		.send({
			embeds: [ticketClosedEmbed(interaction.user, ticket, reason)],
			files: [attachment]
		})
		.catch(() => null);
}

async function buildTranscript(channel) {
	const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
	if (!messages?.size) return 'No messages were available for this ticket transcript.';

	return messages
		.sort((a, b) => a.createdTimestamp - b.createdTimestamp)
		.map((message) => {
			const attachments = [...message.attachments.values()].map((attachment) => attachment.url).join(' ');
			const content = message.content || '[no text content]';
			return `[${new Date(message.createdTimestamp).toISOString()}] ${message.author.tag} (${message.author.id}): ${content}${attachments ? `\nAttachments: ${attachments}` : ''}`;
		})
		.join('\n\n');
}

function ticketWelcomeEmbed(user, ticket, config) {
	return new EmbedBuilder()
		.setColor(color.default)
		.setTitle(`Ticket #${ticket.ticketNumber}`)
		.setDescription(
			[
				`${emojis.custom.person} **Opened By:** ${user}`,
				`${emojis.custom.clock} **Created:** <t:${Math.floor(ticket.createdAt / 1000)}:R>`,
				'',
				'Describe what you need help with. Staff can claim this ticket and close it when the issue is resolved.'
			].join('\n')
		)
		.setFooter({ text: config.title });
}

function ticketClosedEmbed(user, ticket, reason) {
	return new EmbedBuilder()
		.setColor(color.warning)
		.setTitle(`Ticket #${ticket.ticketNumber} Closed`)
		.setDescription(
			[
				`${emojis.custom.person} **Owner:** <@${ticket.ownerId}>`,
				`${emojis.custom.lock} **Closed By:** ${user} (${user.id})`,
				`${emojis.custom.pencil} **Reason:** ${reason}`,
				`${emojis.custom.clock} **Opened:** <t:${Math.floor(ticket.createdAt / 1000)}:F>`
			].join('\n')
		)
		.setTimestamp();
}

function formatTicketChannelName(config, user, ticketNumber) {
	const username =
		user.username
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '')
			.slice(0, 18) || 'user';
	return config.ticketNameFormat
		.replaceAll('{username}', username)
		.replaceAll('{userId}', user.id)
		.replaceAll('{number}', String(ticketNumber).padStart(4, '0'))
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.slice(0, 90);
}

function successEmbed(title, description) {
	return new EmbedBuilder().setColor(color.success).setTitle(title).setDescription(`${emojis.custom.success} ${description}`);
}

function failEmbed(description) {
	return new EmbedBuilder().setColor(color.fail).setDescription(`${emojis.custom.fail} ${description}`);
}

module.exports = {
	TICKET_CLAIM_ID,
	TICKET_CLOSE_ID,
	TICKET_OPEN_ID,
	addTicketUser,
	buildTicketPanel,
	canManageTickets,
	claimTicket,
	closeTicket,
	createTicket,
	formatStaffRoleMentions,
	getOpenTicketByChannel,
	getTicketConfig,
	normalizeStaffRoleIds,
	removeTicketUser,
	updateTicketConfig
};
