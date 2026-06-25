const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { branding, color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder
} = require('discord.js');
const { commandMention } = require('../../lib/util/commandMentions');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../lib/runtime/interactionSessions');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Get the Bot's and API's latency"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('ping')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const sessionId = interaction.id;
			const refreshId = `ping:${sessionId}:refresh`;

			const response = await interaction.reply({
				components: buildPingComponents(interaction, interaction.createdTimestamp, refreshId),
				flags: MessageFlags.IsComponentsV2,
				withResponse: true
			});
			const message = response?.resource?.message ?? (typeof interaction.fetchReply === 'function' ? await interaction.fetchReply().catch(() => null) : null);
			await saveInteractionSession({
				kind: 'ping',
				sessionId,
				ownerId: interaction.user.id,
				guildId: interaction.guildId || interaction.guild?.id || null,
				channelId: interaction.channelId || interaction.channel?.id || null,
				messageId: message?.id || null,
				state: { createdTimestamp: interaction.createdTimestamp }
			});
		} catch (error) {
			console.error(error);
			return sendError(interaction);
		}
	}
}

function buildPingComponents(interaction, createdTimestamp, refreshId, disabled = false) {
	const websocketLatency = Math.round(interaction.client.ws.ping);
	const responseLatency = Math.max(Date.now() - createdTimestamp, 0);
	const websocketStatus = getLatencyStatus(websocketLatency, 100, 200);
	const responseStatus = getLatencyStatus(responseLatency, 200, 400);
	const accentColor = getAccentColor([websocketStatus, responseStatus]);

	const container = new ContainerBuilder()
		.setAccentColor(accentColor)
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`## ${emojis.custom.connected} Cadia Latency\n` + 'Live connection health for Discord gateway traffic and command responses.'
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 })))
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`${websocketStatus.emoji} **WebSocket**\n${emojis.custom.arrowright} ${websocketLatency}ms\n${emojis.custom.arrowright} ${websocketStatus.label} gateway heartbeat.`,
					'',
					`${responseStatus.emoji} **Command Response**\n${emojis.custom.arrowright} ${responseLatency}ms\n${emojis.custom.arrowright} ${responseStatus.label} interaction round-trip.`,
					'',
					`${emojis.custom.clock} Last checked <t:${Math.floor(Date.now() / 1000)}:R>`
				].join('\n')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.info} Green means smooth, yellow means minor delay, red means Discord or the bot may be responding slowly.`
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder().setCustomId(refreshId).setStyle(ButtonStyle.Secondary).setLabel('Refresh').setDisabled(disabled)
			)
		);

	return [container];
}

function getLatencyStatus(latency, goodLimit, okayLimit) {
	if (latency <= goodLimit) {
		return {
			emoji: emojis.custom.online,
			label: 'Healthy',
			level: 'good'
		};
	}

	if (latency <= okayLimit) {
		return {
			emoji: emojis.custom.issues,
			label: 'Elevated',
			level: 'okay'
		};
	}

	return {
		emoji: emojis.custom.offline,
		label: 'Slow',
		level: 'bad'
	};
}

function getAccentColor(statuses) {
	if (statuses.some((status) => status.level === 'bad')) return Number.parseInt(color.fail.replace('#', ''), 16);
	if (statuses.some((status) => status.level === 'okay')) return Number.parseInt(color.warning.replace('#', ''), 16);
	return Number.parseInt(color.success.replace('#', ''), 16);
}

function buildNoticeComponents(message) {
	return [
		new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
	];
}

async function handlePingInteraction(interaction) {
	if (!interaction.isButton?.() || !interaction.customId?.startsWith('ping:')) return false;
	const [, sessionId] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;
	if (interaction.user.id !== ownerId) {
		return interaction.reply({
			components: buildNoticeComponents(`${emojis.custom.forbidden} This latency panel belongs to <@${ownerId}>. Run ${commandMention('ping')} to create your own.`),
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}

	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'ping',
		ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state: { refreshedAt: new Date().toISOString() }
	});
	await interaction.update({
		components: buildPingComponents(interaction, interaction.createdTimestamp, interaction.customId),
		flags: MessageFlags.IsComponentsV2
	});
	return true;
}

async function sendError(interaction) {
	const response = {
		components: buildNoticeComponents(
			`${emojis.custom.fail} Oops, I could not measure latency. Please try again later or use ${commandMention('bug-report')}.`
		),
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	};

	if (interaction.replied || interaction.deferred) return interaction.followUp(response);
	return interaction.reply(response);
}

module.exports = {
	UserCommand,
	buildPingComponents,
	handlePingInteraction
};
