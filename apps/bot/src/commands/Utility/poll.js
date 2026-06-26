const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../lib/runtime/interactionSessions');

const defaultPollDurationSeconds = 300;
const minimumPollDurationSeconds = 30;

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Create a poll in your channel'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('poll')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('topic').setDescription('The topic of your poll').setRequired(true))
				.addStringOption((option) => option.setName('option1').setDescription('The first option for your poll').setRequired(true))
				.addStringOption((option) => option.setName('option2').setDescription('The second option for your poll').setRequired(true))
				.addStringOption((option) => option.setName('option3').setDescription('The third option for your poll').setRequired(false))
				.addStringOption((option) => option.setName('option4').setDescription('The fourth option for your poll').setRequired(false))
				.addStringOption((option) => option.setName('option5').setDescription('The fifth option for your poll').setRequired(false))
				.addIntegerOption((option) =>
					option
						.setName('duration')
						.setDescription('How long the poll should stay open, in seconds')
						.setRequired(false)
						.setMinValue(minimumPollDurationSeconds)
				)
		);
	}

	async chatInputRun(interaction) {
		const topic = interaction.options.getString('topic');
		const choices = ['option1', 'option2', 'option3', 'option4', 'option5'].map((name) => interaction.options.getString(name)).filter(Boolean);
		const durationSeconds = Math.max(interaction.options.getInteger('duration') ?? defaultPollDurationSeconds, minimumPollDurationSeconds);
		const durationMs = durationSeconds * 1_000;
		const closesAt = Math.floor((Date.now() + durationMs) / 1_000);
		const customIds = choices.map((_, index) => `poll:${interaction.id}:${index}`);
		const votes = {};

		const response = await interaction.reply({
			components: [buildPollContainer(interaction, topic, choices, customIds, votes, closesAt)],
			flags: MessageFlags.IsComponentsV2,
			withResponse: true
		});
		const message = response.resource?.message ?? (await interaction.fetchReply());
		await saveInteractionSession({
			kind: 'poll',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guildId || interaction.guild?.id || null,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: message?.id || null,
			state: { topic, choices, customIds, votes, closesAt },
			ttlMs: durationMs
		});
	}
}

function buildPollContainer(interaction, topic, choices, customIds, votes, closesAt, closed = false) {
	const voteValues = normalizeVotes(votes);
	const counts = choices.map((_, index) => voteValues.filter((vote) => vote === index).length);
	const totalVotes = voteValues.length;
	const closingText = closed
		? `${emojis.custom.lock} Voting closed.\n${getWinnerText(choices, counts, totalVotes)}`
		: `${emojis.custom.clock} Voting closes <t:${closesAt}:R>.\n${emojis.custom.calendar} Final results at <t:${closesAt}:t>.`;

	return new ContainerBuilder()
		.setAccentColor(Number.parseInt((closed ? color.warning : color.default).replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`${emojis.custom.upvote} **Poll**`,
					`${emojis.custom.arrowright} **Topic:** ${topic}`,
					`${emojis.custom.person} **Created by:** ${interaction.user}`,
					`${emojis.custom.info} **Votes:** ${totalVotes}`
				].join('\n')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				choices
					.map((choice, index) => {
						const percent = totalVotes ? Math.round((counts[index] / totalVotes) * 100) : 0;
						return `${emojis.custom.arrowright} **Option ${index + 1}:** ${choice}\n${emojis.custom.info} ${counts[index]} vote${counts[index] === 1 ? '' : 's'} - ${percent}%`;
					})
					.join('\n\n')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(closingText))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				...choices.map((_, index) =>
					new ButtonBuilder()
						.setCustomId(customIds[index])
						.setLabel(`Option ${index + 1}`)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(closed)
				)
			)
		);
}

async function handlePollInteraction(interaction) {
	if (!interaction.isButton?.() || !interaction.customId?.startsWith('poll:')) return false;
	const [, sessionId] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	if (!session) {
		return interaction.reply({
			content: `${emojis.custom.warning} This poll was created before restart-safe sessions were available or has expired.`,
			flags: MessageFlags.Ephemeral
		});
	}

	const state = session.state || {};
	const choices = Array.isArray(state.choices) ? state.choices : [];
	const customIds = Array.isArray(state.customIds) ? state.customIds : choices.map((_, index) => `poll:${session.sessionId}:${index}`);
	const selectedIndex = customIds.indexOf(interaction.customId);
	if (selectedIndex === -1) return false;

	const votes = { ...(state.votes || {}) };
	votes[interaction.user.id] = selectedIndex;
	await updateInteractionSession(session.sessionId, {
		kind: 'poll',
		ownerId: session.ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session.channelId || null,
		messageId: interaction.message?.id || session.messageId || null,
		state: { ...state, votes }
	});

	await interaction.update({
		components: [buildPollContainer(interaction, state.topic, choices, customIds, votes, state.closesAt)],
		flags: MessageFlags.IsComponentsV2
	});
	return true;
}

function normalizeVotes(votes) {
	if (votes instanceof Map) return [...votes.values()];
	if (votes && typeof votes === 'object') return Object.values(votes);
	return [];
}

function getWinnerText(choices, counts, totalVotes) {
	if (!totalVotes) return `${emojis.custom.info} No votes were submitted.`;

	const highestCount = Math.max(...counts);
	const winnerIndexes = counts.map((count, index) => (count === highestCount ? index : null)).filter((index) => index !== null);

	if (winnerIndexes.length > 1) {
		return `${emojis.custom.info} Result: tied between ${winnerIndexes.map((index) => `**Option ${index + 1}**`).join(', ')} with **${highestCount}** vote${highestCount === 1 ? '' : 's'} each.`;
	}

	const winnerIndex = winnerIndexes[0];
	return `${emojis.custom.success} Winner: **Option ${winnerIndex + 1}** - ${choices[winnerIndex]} with **${highestCount}** vote${highestCount === 1 ? '' : 's'}.`;
}

module.exports = {
	UserCommand,
	buildPollContainer,
	handlePollInteraction
};
