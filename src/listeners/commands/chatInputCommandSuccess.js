const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');
const { channels, emojis } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');
const { sendAuditLog } = require('../../lib/util/auditLogger');
const { recordCommandRun } = require('../../lib/util/botAnalytics');
const { commandCategory, commandPathFromInteraction, isMeaningfulCommand } = require('../../lib/analytics/growth');
const { recordRpgEvent } = require('../../lib/rpg/growth');
const { recordSeasonActivity } = require('../../lib/rpg/playerGrowth');
const { buildAlertNudge, componentReply, getActiveAlert, markAlertNudged, shouldSendAlertNudge } = require('../../lib/util/globalAlerts');

class UserEvent extends Listener {
	/**
	 * @param {import('@sapphire/framework').ChatInputCommandSuccessPayload} payload
	 */
	run(payload) {
		void handleCommandSuccess(this, payload).catch((error) => this.container.logger.warn(`Command post-processing failed: ${error.message}`));
	}
}

async function handleCommandSuccess(listener, payload) {
	const commandPath = commandPathFromInteraction(payload.interaction);
	const category = commandCategory(payload.command, commandPath);
	const developerCommand = isDeveloperCommand(payload.command);
	const analyticsTasks = [
		recordCommandRun({
			client: listener.container.client,
			user: payload.interaction.user,
			guild: payload.interaction.guild,
			commandName: commandPath,
			commandCategory: category,
			meaningful: isMeaningfulCommand({ commandPath, category, isDeveloper: developerCommand }),
			type: 'slash'
		})
	];
	if (category === 'rpg' && !commandPath.startsWith('rpg admin')) {
		analyticsTasks.push(
			recordRpgEvent({
				guildId: payload.interaction.guild?.id,
				userId: payload.interaction.user.id
			}),
			recordSeasonActivity(payload.interaction.user.id)
		);
	}
	await Promise.allSettled(analyticsTasks);

	if (developerCommand) return;

	const guild = payload.interaction.guild;
	const interaction = payload.interaction;
	const channel = interaction.channel;
	const time = payload.interaction.createdTimestamp;
	const sentIn = guild ? `\`${guild.name}\` - \`${guild.id}\`` : '**Direct Messages**';

	const postTasks = [sendGlobalAlertNudge(interaction)];
	if (guild) {
		postTasks.push(
			sendAuditLog(
				guild,
				'commandUse',
				'Command Used',
				[
					{ label: 'User', value: `${interaction.user} (${interaction.user.id})` },
					{ label: 'Command', value: `/${interaction.commandName}` },
					{ label: 'Channel', value: `${channel} (${channel?.id ?? 'unknown'})` }
				],
				{ emoji: `${emojis.custom.slash}`, user: interaction.user }
			)
		);
	}

	const loggingChannel = listener.container.client.channels.cache.get(channels.commandLogging);
	if (loggingChannel) {
		const embed = new EmbedBuilder()
			.setTimestamp(time)
			.setColor('Random')
			.setAuthor({
				name: `${interaction.user.tag} (${interaction.user.id})`,
				iconURL: interaction.user.displayAvatarURL()
			})
			.setDescription(
				`**Command:** \`/${interaction.commandName}\`\n**Sent In:** ${sentIn}\n**Channel:** \`${channel?.name ? `#${channel.name}` : 'DM'}\` - \`${channel?.id ?? 'unknown'}\``
			);
		postTasks.push(loggingChannel.send({ embeds: [embed] }));
	}

	await Promise.allSettled(postTasks);
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
