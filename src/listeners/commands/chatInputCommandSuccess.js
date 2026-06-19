const { Listener, LogLevel, Command } = require('@sapphire/framework');
const { cyan } = require('colorette');
const { Message, EmbedBuilder } = require('discord.js');
const { channels, emojis } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');
const { sendAuditLog } = require('../../lib/util/auditLogger');
const { recordCommandRun } = require('../../lib/util/botAnalytics');
const { commandCategory, commandPathFromInteraction, isMeaningfulCommand } = require('../../lib/analytics/growth');
const { recordRpgEvent } = require('../../lib/rpg/growth');
const { buildAlertNudge, componentReply, getActiveAlert, markAlertNudged, shouldSendAlertNudge } = require('../../lib/util/globalAlerts');

class UserEvent extends Listener {
	/**
	 * @param {import('@sapphire/framework').ChatInputCommandSuccessPayload} payload
	 */
	async run(payload) {
		const commandPath = commandPathFromInteraction(payload.interaction);
		const category = commandCategory(payload.command, commandPath);
		const developerCommand = isDeveloperCommand(payload.command);
		await recordCommandRun({
			client: this.container.client,
			user: payload.interaction.user,
			guild: payload.interaction.guild,
			commandName: commandPath,
			commandCategory: category,
			meaningful: isMeaningfulCommand({ commandPath, category, isDeveloper: developerCommand }),
			type: 'slash'
		});
		if (category === 'rpg' && !commandPath.startsWith('rpg admin')) {
			await recordRpgEvent({
				guildId: payload.interaction.guild?.id,
				userId: payload.interaction.user.id
			});
		}

		if (developerCommand) return;

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
	if (!(await shouldSendAlertNudge(alert, interaction.user.id).catch(() => false))) return;

	const response = componentReply(buildAlertNudge(alert), true);
	let sent = false;
	if (interaction.replied || interaction.deferred) {
		sent = await interaction.followUp(response).then(
			() => true,
			() => false
		);
	} else {
		sent = await interaction.reply(response).then(
			() => true,
			() => false
		);
	}

	if (sent) await markAlertNudged(alert, interaction.user.id).catch(() => null);
}
