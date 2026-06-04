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
		const votes = new Map();

		const response = await interaction.reply({
			components: [buildPollContainer(interaction, topic, choices, customIds, votes, closesAt)],
			flags: MessageFlags.IsComponentsV2,
			withResponse: true
		});
		const message = response.resource?.message ?? (await interaction.fetchReply());
		const collector = message.createMessageComponentCollector({
			time: durationMs
		});

		collector.on('collect', async (i) => {
			const selectedIndex = customIds.indexOf(i.customId);
			if (selectedIndex === -1) return;

			votes.set(i.user.id, selectedIndex);

			await i.update({
				components: [buildPollContainer(interaction, topic, choices, customIds, votes, closesAt)],
				flags: MessageFlags.IsComponentsV2
			});
		});

		collector.on('end', async () => {
			await interaction
				.editReply({
					components: [buildPollContainer(interaction, topic, choices, customIds, votes, closesAt, true)],
					flags: MessageFlags.IsComponentsV2
				})
				.catch(() => null);
		});
	}
}

function buildPollContainer(interaction, topic, choices, customIds, votes, closesAt, closed = false) {
	const counts = choices.map((_, index) => [...votes.values()].filter((vote) => vote === index).length);
	const totalVotes = votes.size;
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
	UserCommand
};
