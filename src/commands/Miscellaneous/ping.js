const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
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
			const refreshId = `ping:${interaction.id}:refresh`;

			const message = await interaction.reply({
				components: buildPingComponents(interaction, interaction.createdTimestamp, refreshId),
				flags: MessageFlags.IsComponentsV2,
				withResponse: true
			});
			const responseMessage = message.resource?.message ?? (await interaction.fetchReply());

			const collector = responseMessage.createMessageComponentCollector({
				time: 120_000
			});

			collector.on('collect', async (i) => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({
						components: buildNoticeComponents(
							`${emojis.custom.forbidden} This latency panel belongs to ${interaction.user}. Run \`/ping\` to create your own.`
						),
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					});
				}

				if (i.customId !== refreshId) return;

				await i.update({
					components: buildPingComponents(interaction, i.createdTimestamp, refreshId),
					flags: MessageFlags.IsComponentsV2
				});
			});

			collector.on('end', async () => {
				await interaction
					.editReply({
						components: buildPingComponents(interaction, Date.now(), refreshId, true),
						flags: MessageFlags.IsComponentsV2
					})
					.catch(() => null);
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

async function sendError(interaction) {
	const response = {
		components: buildNoticeComponents(
			`${emojis.custom.fail} Oops, I could not measure latency. Please try again later or use </bugreport:1219050295770742934>.`
		),
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	};

	if (interaction.replied || interaction.deferred) return interaction.followUp(response);
	return interaction.reply(response);
}

module.exports = {
	UserCommand
};
