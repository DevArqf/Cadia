const {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	EmbedBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	SeparatorBuilder,
	SeparatorSpacingSize,
	SectionBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	ThumbnailBuilder
} = require('discord.js');
const { color, emojis } = require('../../config');
const { TicketConfigSchema, TicketSchema } = require('../schemas/ticketSchema');
const { normalizeTicketAppearance, renderTicketTemplate } = require('../tickets/appearance');
const { addTemplateText } = require('./componentsV2');

const TICKET_OPEN_ID = 'ticket:open';
const TICKET_CLAIM_ID = 'ticket:claim';
const TICKET_CLOSE_ID = 'ticket:close';
const TICKET_CLOSE_SUBMIT_ID = 'ticket:close:submit';
const TICKET_DELETE_DELAY_MS = 5_000;

async function getTicketConfig(guildId) {
	let config = await TicketConfigSchema.findOne({ guildId });
	if (!config) config = await TicketConfigSchema.create({ guildId });

	config.maxOpenTickets = Math.max(1, Number(config.maxOpenTickets) || 1);
	config.staffRoleIds = normalizeStaffRoleIds(config);
	config.ticketNameFormat = config.ticketNameFormat || 'ticket-{username}';
	config.title = config.title || 'Need help?';
	config.description = config.description || 'Open a ticket and the support team will help you as soon as possible.';
	const appearance = normalizeTicketAppearance(config);
	config.panel = appearance.panel;
	config.openedTicket = appearance.openedTicket;
	return config;
}

async function updateTicketConfig(guildId, patch) {
	const config = await getTicketConfig(guildId);
	const nextPatch = { ...patch };
	if (patch.staffRoleIds) nextPatch.staffRoleIds = normalizeStaffRoleIds(patch);
	Object.assign(config, nextPatch);
	const appearance = normalizeTicketAppearance(config);
	Object.assign(config, appearance, { title: appearance.panel.title, description: appearance.panel.description, updatedAt: Date.now() });
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

	await channel.send(buildTicketWelcomePayload(interaction.user, ticket, config, interaction.guild));

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

	const deleteAt = Date.now() + TICKET_DELETE_DELAY_MS;
	await interaction.reply({ embeds: [successEmbed('Closing Ticket', `Saving the transcript now. This ticket will be deleted in **5 seconds** (<t:${Math.ceil(deleteAt / 1000)}:R>).\n**Reason:** ${reason || 'No reason provided.'}`)] });
	await sendTicketTranscript(interaction, ticket, reason);

	ticket.status = 'closed';
	ticket.closedById = interaction.user.id;
	ticket.closeReason = reason;
	ticket.closedAt = Date.now();
	ticket.updatedAt = Date.now();
	await ticket.save();

	setTimeout(() => interaction.channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason || 'No reason provided.'}`).catch(() => null), TICKET_DELETE_DELAY_MS);
}

function buildCloseTicketModal() {
	return new ModalBuilder().setCustomId(TICKET_CLOSE_SUBMIT_ID).setTitle('Close Ticket').addComponents(
		new ActionRowBuilder().addComponents(
			new TextInputBuilder().setCustomId('reason').setLabel('Reason (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
		)
	);
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

function buildTicketPanel(config, guild = null) {
	const panel = normalizeTicketAppearance(config).panel;
	const variables = { maxopen: String(config.maxOpenTickets || 1), paneltitle: panel.title, servericon: guild?.iconURL?.({ size: 1024 }) || '' };
	const title = renderTicketTemplate(panel.title, variables, 256);
	const description = renderTicketTemplate(panel.description, variables, 4096);
	const footer = renderTicketTemplate(panel.footer, variables, 2048);
	const author = renderTicketTemplate(panel.authorName, variables, 256);
	const thumbnailUrl = renderAsset(panel.thumbnailUrl, variables);
	const imageUrl = renderAsset(panel.imageUrl, variables);
	const control = buildOpenTicketControl(panel);

	if (panel.style === 'componentsV2') {
		const container = new ContainerBuilder().setAccentColor(Number.parseInt(panel.color.slice(1), 16));
		const header = [title ? `## ${title}` : '', author ? `-# ${author}` : ''].filter(Boolean).join('\n');
		if (thumbnailUrl) {
			container.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(header || '## Open a Ticket')).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl))
			);
		} else container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header || '## Open a Ticket'));
		addTemplateText(container, description || 'Open a ticket below.');
		if (imageUrl) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imageUrl)));
		if (footer || panel.showTimestamp) {
			addTemplateText(container, [footer ? `-# ${footer}` : '', panel.showTimestamp ? `-# Sent <t:${Math.floor(Date.now() / 1000)}:F>` : ''].filter(Boolean).join('\n'));
		}
		container.addActionRowComponents(new ActionRowBuilder().addComponents(control));
		return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } };
	}
	const embed = new EmbedBuilder()
		.setColor(panel.color)
		.setTitle(title)
		.setDescription(description);
	if (author) embed.setAuthor({ name: author, ...(renderAsset(panel.authorIconUrl, variables) ? { iconURL: renderAsset(panel.authorIconUrl, variables) } : {}) });
	if (footer) embed.setFooter({ text: footer, ...(renderAsset(panel.footerIconUrl, variables) ? { iconURL: renderAsset(panel.footerIconUrl, variables) } : {}) });
	if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
	if (imageUrl) embed.setImage(imageUrl);
	if (panel.showTimestamp) embed.setTimestamp();

	return {
		embeds: [embed],
		components: [new ActionRowBuilder().addComponents(control)]
	};
}

function buildOpenTicketControl(panel) {
	if (panel.controlType === 'select') {
		const option = new StringSelectMenuOptionBuilder().setLabel(panel.buttonLabel).setValue('open');
		if (panel.buttonEmoji) option.setEmoji(panel.buttonEmoji);
		return new StringSelectMenuBuilder().setCustomId(TICKET_OPEN_ID).setPlaceholder(panel.buttonLabel).addOptions(option);
	}
	const button = new ButtonBuilder().setCustomId(TICKET_OPEN_ID).setLabel(panel.buttonLabel).setStyle(ButtonStyle.Primary);
	if (panel.buttonEmoji) button.setEmoji(panel.buttonEmoji);
	return button;
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

function ticketWelcomeEmbed(user, ticket, config, guild = null) {
	const appearance = normalizeTicketAppearance(config);
	const opened = appearance.openedTicket;
	const variables = {
		user: String(user),
		username: user.username,
		userid: user.id,
		ticketnumber: String(ticket.ticketNumber),
		created: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`,
		paneltitle: appearance.panel.title,
		servericon: guild?.iconURL?.({ size: 1024 }) || ''
	};
	const embed = new EmbedBuilder().setColor(opened.color)
		.setTitle(renderTicketTemplate(opened.title, variables, 256))
		.setDescription(renderTicketTemplate(opened.description, variables, 4096));
	if (opened.authorName) embed.setAuthor({ name: renderTicketTemplate(opened.authorName, variables, 256), ...(renderAsset(opened.authorIconUrl, variables) ? { iconURL: renderAsset(opened.authorIconUrl, variables) } : {}) });
	if (opened.footer) embed.setFooter({ text: renderTicketTemplate(opened.footer, variables, 2048), ...(renderAsset(opened.footerIconUrl, variables) ? { iconURL: renderAsset(opened.footerIconUrl, variables) } : {}) });
	if (renderAsset(opened.thumbnailUrl, variables)) embed.setThumbnail(renderAsset(opened.thumbnailUrl, variables));
	if (renderAsset(opened.imageUrl, variables)) embed.setImage(renderAsset(opened.imageUrl, variables));
	if (opened.showTimestamp) embed.setTimestamp();
	return embed;
}

function buildTicketWelcomePayload(user, ticket, config, guild = null) {
	const appearance = normalizeTicketAppearance(config);
	const opened = appearance.openedTicket;
	if (opened.style !== 'componentsV2') {
		return {
			content: `${user}${formatStaffRoleMentions(config.staffRoleIds)}`,
			embeds: [ticketWelcomeEmbed(user, ticket, config, guild)],
			components: [ticketControlRow(ticket)]
		};
	}
	const variables = ticketTemplateVariables(user, ticket, appearance, guild);
	const container = new ContainerBuilder().setAccentColor(Number.parseInt(opened.color.slice(1), 16));
	const title = renderTicketTemplate(opened.title, variables, 256);
	const author = renderTicketTemplate(opened.authorName, variables, 256);
	const thumbnail = renderAsset(opened.thumbnailUrl, variables);
	const header = [`${user}${formatStaffRoleMentions(config.staffRoleIds)}`, title ? `## ${title}` : '', author ? `-# ${author}` : ''].filter(Boolean).join('\n');
	if (thumbnail) container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(header)).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)));
	else container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));
	addTemplateText(container, renderTicketTemplate(opened.description, variables, 4096));
	const image = renderAsset(opened.imageUrl, variables);
	if (image) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
	const footer = renderTicketTemplate(opened.footer, variables, 2048);
	if (footer || opened.showTimestamp) addTemplateText(container, [footer ? `-# ${footer}` : '', opened.showTimestamp ? `-# Created <t:${Math.floor(ticket.createdAt / 1000)}:F>` : ''].filter(Boolean).join('\n'));
	container.addActionRowComponents(ticketControlRow(ticket));
	return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { users: [user.id], roles: config.staffRoleIds || [] } };
}

function ticketTemplateVariables(user, ticket, appearance, guild) {
	return {
		user: String(user), username: user.username, userid: user.id, ticketnumber: String(ticket.ticketNumber),
		created: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, paneltitle: appearance.panel.title,
		servericon: guild?.iconURL?.({ size: 1024 }) || ''
	};
}

function renderAsset(template, variables) {
	const rendered = renderTicketTemplate(template, variables, 2000);
	return /^https:\/\//i.test(rendered) ? rendered : '';
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
	TICKET_CLOSE_SUBMIT_ID,
	TICKET_OPEN_ID,
	addTicketUser,
	buildTicketPanel,
	buildTicketWelcomePayload,
	buildCloseTicketModal,
	ticketWelcomeEmbed,
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
