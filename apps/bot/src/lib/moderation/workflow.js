const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { color } = require('../../config/colors');
const { emojis } = require('../../config/emojis');

const DEFAULT_REASON = 'No reason provided';

async function fetchTargetMember(interaction, userId) {
	return interaction.guild.members.fetch(userId).catch(() => null);
}

async function respond(interaction, payload, { privateResponse = false } = {}) {
	const response = { ...payload };
	if (privateResponse && !interaction.deferred && !interaction.replied) response.flags = MessageFlags.Ephemeral;

	if (interaction.deferred || interaction.replied) return interaction.editReply(response);
	return interaction.reply(response);
}

async function reject(interaction, message) {
	return respond(interaction, { content: message }, { privateResponse: true });
}

async function validateModerationTarget({ interaction, targetMember, action, permission, capability, allowMissing = false }) {
	if (permission && !interaction.member.permissions.has(permission)) {
		await reject(interaction, `${emojis.custom.forbidden} You do not have permission to ${action} members.`);
		return false;
	}

	const botMember = interaction.guild.members.me;
	if (permission && botMember && !botMember.permissions.has(permission)) {
		await reject(interaction, `${emojis.custom.forbidden} Cadia does not have permission to ${action} members.`);
		return false;
	}

	if (!targetMember) {
		if (allowMissing) return true;
		await reject(interaction, `${emojis.custom.fail} That user is no longer in this server.`);
		return false;
	}

	if (interaction.user.id === targetMember.id) {
		await reject(interaction, `${emojis.custom.fail} You cannot ${action} yourself.`);
		return false;
	}

	if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
		await reject(interaction, `${emojis.custom.forbidden} You cannot ${action} a member with the Administrator permission.`);
		return false;
	}

	const actorHighestRole = interaction.member.roles?.highest;
	const targetHighestRole = targetMember.roles?.highest;
	const actorOwnsGuild = interaction.guild.ownerId === interaction.user.id;
	if (!actorOwnsGuild && actorHighestRole && targetHighestRole && actorHighestRole.comparePositionTo(targetHighestRole) <= 0) {
		await reject(interaction, `${emojis.custom.forbidden} You cannot ${action} a member with an equal or higher role.`);
		return false;
	}

	if (capability && !targetMember[capability]) {
		await reject(interaction, `${emojis.custom.forbidden} Cadia cannot ${action} this member because of the role hierarchy.`);
		return false;
	}

	return true;
}

async function sendDmNotice({ user, payload, logger, action }) {
	try {
		await user.send(payload);
		return true;
	} catch (error) {
		logger?.warn(`Could not DM ${user.tag || user.id} before ${action}: ${error.message}`);
		return false;
	}
}

async function runModerationAction({ interaction, action, success, errorMessage, logger, defer = true }) {
	try {
		if (defer && !interaction.deferred && !interaction.replied) await interaction.deferReply();
		const result = await action();
		return respond(interaction, typeof success === 'function' ? success(result) : success);
	} catch (error) {
		logger?.error(error);
		const embed = new EmbedBuilder().setColor(color.fail).setDescription(`${emojis.custom.fail} ${errorMessage}`).setTimestamp();
		return respond(interaction, { embeds: [embed] }, { privateResponse: true });
	}
}

function createModerationEmbed({ target, action, reason, moderator, colorValue = color.default, footer, fields = [] }) {
	return new EmbedBuilder()
		.setColor(colorValue)
		.setDescription(`${emojis.custom.info} **${target}** has been **${action}**.`)
		.addFields(
			{ name: `${emojis.custom.mail} Reason`, value: reason },
			{ name: `${emojis.custom.person} Moderator`, value: moderator.toString() },
			...fields
		)
		.setFooter({ text: footer })
		.setTimestamp();
}

function parseTimeoutDuration(value) {
	const match = /^(\d+)([mhd])$/.exec(value);
	if (!match) throw new Error('Use a duration such as 15m, 2h, or 1d.');

	const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000 };
	const duration = Number(match[1]) * multipliers[match[2]];
	if (duration <= 0 || duration > 28 * 86_400_000) throw new Error('Discord timeouts must be between 1 minute and 28 days.');
	return duration;
}

module.exports = {
	DEFAULT_REASON,
	createModerationEmbed,
	fetchTargetMember,
	parseTimeoutDuration,
	reject,
	respond,
	runModerationAction,
	sendDmNotice,
	validateModerationTarget
};
