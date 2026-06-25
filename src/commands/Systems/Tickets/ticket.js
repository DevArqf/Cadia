const { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { color, emojis } = require('../../../config');
const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { commandMention } = require('../../../lib/util/commandMentions');
const {
	addTicketUser,
	buildTicketPanel,
	claimTicket,
	closeTicket,
	getOpenTicketByChannel,
	getTicketConfig,
	normalizeStaffRoleIds,
	removeTicketUser,
	updateTicketConfig
} = require('../../../lib/util/ticketSystem');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Administrator,
			requiredClientPermissions: [PermissionFlagsBits.ManageChannels],
			description: 'Configure and manage the advanced ticket system'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('ticket')
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('setup')
						.setDescription('Create or update the ticket panel')
						.addChannelOption((option) =>
							option
								.setName('panel-channel')
								.setDescription('Channel where the ticket panel will be posted')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
								.setRequired(true)
						)
						.addRoleOption((option) => option.setName('staff-role').setDescription('Role that can manage tickets').setRequired(true))
						.addRoleOption((option) => option.setName('staff-role-2').setDescription('Additional ticket staff role').setRequired(false))
						.addRoleOption((option) => option.setName('staff-role-3').setDescription('Additional ticket staff role').setRequired(false))
						.addRoleOption((option) => option.setName('staff-role-4').setDescription('Additional ticket staff role').setRequired(false))
						.addRoleOption((option) => option.setName('staff-role-5').setDescription('Additional ticket staff role').setRequired(false))
						.addChannelOption((option) =>
							option
								.setName('category')
								.setDescription('Category where ticket channels will be created')
								.addChannelTypes(ChannelType.GuildCategory)
								.setRequired(false)
						)
						.addChannelOption((option) =>
							option
								.setName('log-channel')
								.setDescription('Channel that receives ticket transcripts')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
								.setRequired(false)
						)
						.addIntegerOption((option) =>
							option
								.setName('max-open')
								.setDescription('Maximum open tickets per member')
								.setMinValue(1)
								.setMaxValue(10)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('panel')
						.setDescription('Send a new ticket panel using the saved setup')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('Where to send the panel')
								.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('settings')
						.setDescription('Update ticket text and naming')
						.addStringOption((option) =>
							option.setName('title').setDescription('Ticket panel title').setMaxLength(100).setRequired(false)
						)
						.addStringOption((option) =>
							option.setName('description').setDescription('Ticket panel description').setMaxLength(1000).setRequired(false)
						)
						.addStringOption((option) =>
							option
								.setName('name-format')
								.setDescription('Channel name format: {username}, {userId}, {number}')
								.setMaxLength(90)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('add')
						.setDescription('Add a user to the current ticket')
						.addUserOption((option) => option.setName('user').setDescription('User to add').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('remove')
						.setDescription('Remove a user from the current ticket')
						.addUserOption((option) => option.setName('user').setDescription('User to remove').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('staff-add')
						.setDescription('Add another role that can manage tickets')
						.addRoleOption((option) => option.setName('role').setDescription('Staff role to add').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('staff-remove')
						.setDescription('Remove a role from ticket staff')
						.addRoleOption((option) => option.setName('role').setDescription('Staff role to remove').setRequired(true))
				)
				.addSubcommand((subcommand) => subcommand.setName('claim').setDescription('Claim the current ticket'))
				.addSubcommand((subcommand) =>
					subcommand
						.setName('close')
						.setDescription('Close the current ticket')
						.addStringOption((option) => option.setName('reason').setDescription('Close reason').setMaxLength(500).setRequired(false))
				)
				.addSubcommand((subcommand) => subcommand.setName('status').setDescription('View ticket system status'))
				.addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Disable ticket creation'))
		);
	}

	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'setup') return setupTickets(interaction);
		if (subcommand === 'panel') return sendPanel(interaction);
		if (subcommand === 'settings') return updateSettings(interaction);
		if (subcommand === 'add') return addTicketUser(interaction, interaction.options.getUser('user', true));
		if (subcommand === 'remove') return removeTicketUser(interaction, interaction.options.getUser('user', true));
		if (subcommand === 'staff-add') return addStaffRole(interaction);
		if (subcommand === 'staff-remove') return removeStaffRole(interaction);
		if (subcommand === 'claim') return claimTicket(interaction);
		if (subcommand === 'close') return closeTicket(interaction, interaction.options.getString('reason') || 'Closed by staff command.');
		if (subcommand === 'status') return showStatus(interaction);
		if (subcommand === 'disable') return disableTickets(interaction);
	}
}

async function setupTickets(interaction) {
	const panelChannel = interaction.options.getChannel('panel-channel', true);
	const staffRoles = getSetupStaffRoles(interaction);
	const category = interaction.options.getChannel('category');
	const logChannel = interaction.options.getChannel('log-channel');
	const maxOpenTickets = interaction.options.getInteger('max-open') || 1;

	const config = await updateTicketConfig(interaction.guild.id, {
		enabled: true,
		panelChannelId: panelChannel.id,
		categoryId: category?.id ?? null,
		staffRoleId: staffRoles[0].id,
		staffRoleIds: staffRoles.map((role) => role.id),
		logChannelId: logChannel?.id ?? null,
		maxOpenTickets
	});

	const panelMessage = await panelChannel.send(buildTicketPanel(config));
	config.panelMessageId = panelMessage.id;
	config.updatedAt = Date.now();
	await config.save();

	return interaction.reply({
		embeds: [
			successEmbed(
				'Ticket System Enabled',
				[
					`${emojis.custom.openfolder} **Panel:** ${panelChannel}`,
					`${emojis.custom.person} **Staff:** ${formatRoleList(staffRoles.map((role) => role.id))}`,
					`${emojis.custom.save} **Transcripts:** ${logChannel || 'Not configured'}`,
					`${emojis.custom.info} **Max Open:** ${maxOpenTickets} per member`
				].join('\n')
			)
		],
		flags: MessageFlags.Ephemeral
	});
}

async function addStaffRole(interaction) {
	const role = interaction.options.getRole('role', true);
	const config = await getTicketConfig(interaction.guild.id);
	const staffRoleIds = [...new Set([...normalizeStaffRoleIds(config), role.id])];

	await updateTicketConfig(interaction.guild.id, { staffRoleIds, staffRoleId: staffRoleIds[0] ?? null });
	return interaction.reply({
		embeds: [
			successEmbed(
				'Ticket Staff Role Added',
				`${role} can now manage tickets.\n\n${emojis.custom.person} **Staff Roles:** ${formatRoleList(staffRoleIds)}`
			)
		],
		flags: MessageFlags.Ephemeral
	});
}

async function removeStaffRole(interaction) {
	const role = interaction.options.getRole('role', true);
	const config = await getTicketConfig(interaction.guild.id);
	const staffRoleIds = normalizeStaffRoleIds(config).filter((roleId) => roleId !== role.id);

	await updateTicketConfig(interaction.guild.id, { staffRoleIds, staffRoleId: staffRoleIds[0] ?? null });
	return interaction.reply({
		embeds: [
			successEmbed(
				'Ticket Staff Role Removed',
				`${role} can no longer manage tickets.\n\n${emojis.custom.person} **Staff Roles:** ${formatRoleList(staffRoleIds)}`
			)
		],
		flags: MessageFlags.Ephemeral
	});
}

async function sendPanel(interaction) {
	const config = await getTicketConfig(interaction.guild.id);
	if (!config.enabled)
		return interaction.reply({ embeds: [failEmbed(`The ticket system is disabled. Use ${commandMention('ticket setup')} first.`)], flags: MessageFlags.Ephemeral });

	const channel = interaction.options.getChannel('channel') || interaction.guild.channels.cache.get(config.panelChannelId) || interaction.channel;
	const message = await channel.send(buildTicketPanel(config));
	config.panelChannelId = channel.id;
	config.panelMessageId = message.id;
	config.updatedAt = Date.now();
	await config.save();

	return interaction.reply({ embeds: [successEmbed('Panel Sent', `A ticket panel was sent in ${channel}.`)], flags: MessageFlags.Ephemeral });
}

async function updateSettings(interaction) {
	const patch = {};
	const title = interaction.options.getString('title');
	const description = interaction.options.getString('description');
	const ticketNameFormat = interaction.options.getString('name-format');

	if (title) patch.title = title;
	if (description) patch.description = description;
	if (ticketNameFormat) patch.ticketNameFormat = ticketNameFormat;
	if (!Object.keys(patch).length)
		return interaction.reply({ embeds: [failEmbed('Provide at least one setting to update.')], flags: MessageFlags.Ephemeral });

	await updateTicketConfig(interaction.guild.id, patch);
	return interaction.reply({
		embeds: [successEmbed('Ticket Settings Updated', 'The ticket panel settings were saved.')],
		flags: MessageFlags.Ephemeral
	});
}

async function showStatus(interaction) {
	const config = await getTicketConfig(interaction.guild.id);
	const ticket = await getOpenTicketByChannel(interaction.channelId);
	const staffRoleIds = normalizeStaffRoleIds(config);
	const embed = new EmbedBuilder()
		.setColor(config.enabled ? color.success : color.warning)
		.setTitle('Ticket System Status')
		.setDescription(
			[
				`${config.enabled ? emojis.custom.success : emojis.custom.warning} **Status:** ${config.enabled ? 'Enabled' : 'Disabled'}`,
				`${emojis.custom.openfolder} **Panel Channel:** ${config.panelChannelId ? `<#${config.panelChannelId}>` : 'Not set'}`,
				`${emojis.custom.openfolder} **Ticket Category:** ${config.categoryId ? `<#${config.categoryId}>` : 'Server default'}`,
				`${emojis.custom.person} **Staff Roles:** ${formatRoleList(staffRoleIds)}`,
				`${emojis.custom.save} **Transcript Logs:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not configured'}`,
				`${emojis.custom.info} **Max Open:** ${config.maxOpenTickets} per member`,
				ticket ? `${emojis.custom.mail} **Current Ticket:** #${ticket.ticketNumber} owned by <@${ticket.ownerId}>` : null
			]
				.filter(Boolean)
				.join('\n')
		)
		.setTimestamp();

	return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

function getSetupStaffRoles(interaction) {
	return ['staff-role', 'staff-role-2', 'staff-role-3', 'staff-role-4', 'staff-role-5']
		.map((name) => interaction.options.getRole(name))
		.filter(Boolean)
		.filter((role, index, roles) => roles.findIndex((entry) => entry.id === role.id) === index);
}

function formatRoleList(roleIds) {
	return roleIds.length ? roleIds.map((roleId) => `<@&${roleId}>`).join(', ') : 'Manage Channels permission only';
}

async function disableTickets(interaction) {
	await updateTicketConfig(interaction.guild.id, { enabled: false });
	return interaction.reply({
		embeds: [successEmbed('Ticket System Disabled', 'Members can no longer create new tickets.')],
		flags: MessageFlags.Ephemeral
	});
}

function successEmbed(title, description) {
	return new EmbedBuilder().setColor(color.success).setTitle(title).setDescription(`${emojis.custom.success} ${description}`);
}

function failEmbed(description) {
	return new EmbedBuilder().setColor(color.fail).setDescription(`${emojis.custom.fail} ${description}`);
}

module.exports = {
	UserCommand
};
