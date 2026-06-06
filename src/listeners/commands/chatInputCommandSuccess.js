const { Listener, LogLevel, Command } = require('@sapphire/framework');
const { cyan } = require('colorette');
const { Message, EmbedBuilder } = require('discord.js');
const { channels, emojis } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');
const { sendAuditLog } = require('../../lib/util/auditLogger');
const { buildAlertNudge, componentReply, getActiveAlert } = require('../../lib/util/globalAlerts');

class UserEvent extends Listener {
	/**
	 * @param {import('@sapphire/framework').ChatInputCommandSuccessPayload} payload
	 */
	async run(payload) {
		if (isDeveloperCommand(payload.command)) return;

		const guild = payload.interaction.guild;
		const channel = payload.interaction.channel.name;
		const time = payload.interaction.createdTimestamp;
		const interaction = payload.interaction;
		const sentIn = guild ? `\`${guild.name}\` - \`${guild.id}\`` : '**Direct Messages**';

		if (guild) {
			await sendAuditLog(
				guild,
				'commandUse',
				'Command Used',
				[
					{ label: 'User', value: `${interaction.user} (${interaction.user.id})` },
					{ label: 'Command', value: `/${interaction.commandName}` },
					{ label: 'Channel', value: `${interaction.channel} (${interaction.channel.id})` }
				],
				{ emoji: `${emojis.custom.slash}`, user: interaction.user }
			);
		}

		await sendGlobalAlertNudge(interaction);

		const loggingChannel = this.container.client.channels.cache.get(channels.commandLogging);
		if (!loggingChannel) return;

		const embed = new EmbedBuilder()
			.setTimestamp(time)
			.setColor('Random')
			.setAuthor({ name: `${interaction.member.user.tag} (${interaction.member.id})`, iconURL: interaction.user.displayAvatarURL() })
			.setDescription(
				`**Command:** \`/${interaction.commandName}\`\n**Sent In:** ${sentIn}\n**Channel:** \`#${channel}\` - \`${interaction.channel.id}\``
			);

		await loggingChannel.send({ embeds: [embed] });
	}
}

module.exports = {
	UserEvent
};

function isDeveloperCommand(command) {
	return command?.permissionLevel >= PermissionLevels.Developer || /commands[\\/]Developer/.test(command?.location?.full ?? '');
}

async function sendGlobalAlertNudge(interaction) {
	if (interaction.commandName === 'alert') return;

	const alert = await getActiveAlert().catch(() => null);
	if (!alert) return;

	const response = componentReply(buildAlertNudge(alert), true);
	if (interaction.replied || interaction.deferred) {
		await interaction.followUp(response).catch(() => null);
		return;
	}

	await interaction.reply(response).catch(() => null);
}
