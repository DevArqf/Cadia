const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { color, emojis } = require('../../config');
const { getInteractionSession, saveInteractionSession } = require('../runtime/interactionSessions');

const words = [
	'waterfall',
	'island',
	'volcano',
	'forest',
	'purple',
	'football',
	'campfire',
	'flashlight',
	'pineapple',
	'discord',
	'blankets',
	'frostbite',
	'charmander',
	'pikachu',
	'brilliance'
];

const sentences = [
	'Rex Quinfrey created plans for an invisibility machine.',
	'Trixie and Veronica love to play with their pink ball of yarn.',
	'We climbed to the top of the mountain in under two hours.',
	'Cadia is always there when a Discord community needs it.'
];

async function runCustomGame(interaction, subcommand) {
	if (subcommand === 'fast-type') return runFastType(interaction);
	if (subcommand === 'word-shuffle') return runWordShuffle(interaction);
	if (subcommand === 'gunfight') return runGunfight(interaction);
	return false;
}

async function runFastType(interaction) {
	const sentence = randomEntry(sentences);
	await interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setColor(color.default)
				.setTitle('Fast-Type Challenge')
				.setDescription(`Type this sentence exactly:\n\n"${sentence}"`)
				.setFooter({ text: 'You have 15 seconds.' })
		]
	});

	const collector = interaction.channel.createMessageCollector({
		filter: (message) => message.author.id === interaction.user.id,
		time: 15_000
	});
	let completed = false;

	collector.on('collect', async (message) => {
		if (message.content.toLowerCase() !== sentence.toLowerCase()) return;
		completed = true;
		collector.stop('completed');
		const seconds = Math.max((message.createdTimestamp - interaction.createdTimestamp) / 1000, 0).toFixed(2);
		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor(color.success)
					.setTitle('Challenge Complete')
					.setDescription(`${message.author} completed the challenge in **${seconds}s**.`)
			]
		});
	});

	collector.on('end', async () => {
		if (completed) return;
		await interaction.editReply({
			embeds: [new EmbedBuilder().setColor(color.fail).setTitle('Time Expired').setDescription(`${emojis.custom.clock} You ran out of time.`)]
		});
	});
	return true;
}

async function runWordShuffle(interaction) {
	const selectedWord = randomEntry(words);
	const shuffledWord = shuffleWord(selectedWord);
	await interaction.reply({
		embeds: [
			new EmbedBuilder()
				.setColor(color.default)
				.setTitle('Word Shuffle')
				.setDescription(`Unscramble: \`${shuffledWord}\`\n\nYou have 30 seconds.`)
		]
	});

	const collector = interaction.channel.createMessageCollector({
		filter: (message) => message.author.id === interaction.user.id,
		time: 30_000,
		max: 1
	});

	collector.on('collect', async (message) => {
		const correct = message.content.toLowerCase().trim() === selectedWord;
		await interaction.followUp({
			embeds: [
				new EmbedBuilder()
					.setColor(correct ? color.success : color.fail)
					.setDescription(
						correct
							? `${emojis.custom.tada2} Correct. The word was \`${selectedWord}\`.`
							: `${emojis.custom.fail} Incorrect. The word was \`${selectedWord}\`.`
					)
			]
		});
	});

	collector.on('end', async (collected) => {
		if (collected.size) return;
		await interaction.followUp({
			embeds: [new EmbedBuilder().setColor(color.fail).setDescription(`${emojis.custom.clock} Time expired. The word was \`${selectedWord}\`.`)]
		});
	});
	return true;
}

async function runGunfight(interaction) {
	const opponent = interaction.options.getUser('player', true);
	if (opponent.id === interaction.user.id || opponent.bot) {
		return interaction.reply({
			content: `${emojis.custom.fail} Select another human player.`,
			flags: MessageFlags.Ephemeral
		});
	}

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId(`gunfight:${interaction.id}:accept`).setLabel('Accept').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId(`gunfight:${interaction.id}:decline`).setLabel('Decline').setStyle(ButtonStyle.Danger)
	);
	const response = await interaction.reply({
		content: `${opponent}, ${interaction.user} challenged you to a gunfight.`,
		components: [row],
		withResponse: true
	});
	const message = response.resource?.message ?? (await interaction.fetchReply());
	await saveInteractionSession({
		kind: 'gunfight',
		sessionId: interaction.id,
		ownerId: opponent.id,
		guildId: interaction.guildId || interaction.guild?.id || null,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message?.id || null,
		state: { challengerId: interaction.user.id, opponentId: opponent.id },
		ttlMs: 60_000
	});
	return true;
}

async function handleGunfightInteraction(component) {
	if (!component.customId?.startsWith('gunfight:')) return false;
	const [, sessionId, action] = component.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: component.message?.id });
	if (!session) {
		await component.reply({ content: `${emojis.custom.clock} This gunfight challenge expired.`, flags: MessageFlags.Ephemeral });
		return true;
	}
	if (component.user.id !== session.ownerId) {
		await component.reply({ content: `${emojis.custom.forbidden} Only the challenged player can answer this gunfight.`, flags: MessageFlags.Ephemeral });
		return true;
	}

	await component.deferUpdate();
	const opponent = `<@${session.state?.opponentId || component.user.id}>`;
	const challengerId = session.state?.challengerId;
	if (action === 'decline') {
		await component.editReply({ content: `${opponent} declined the challenge.`, components: [] });
		return true;
	}

	await component.editReply({ content: 'Get ready. The draw word will appear shortly.', components: [] });
	await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5000) + 3000));
	const drawWord = randomEntry(['shoot', 'draw', 'aim', 'reload', 'fire']);
	await component.followUp(`Type **${drawWord}** now.`);
	const winner = await component.channel.awaitMessages({
		filter: (message) => [challengerId, session.state?.opponentId].includes(message.author.id) && message.content.toLowerCase() === drawWord,
		max: 1,
		time: 60_000
	});
	const winnerUser = winner.first()?.author;
	await component.followUp(
		winnerUser ? `${emojis.custom.tada2} ${winnerUser} won the gunfight.` : `${emojis.custom.fail} Nobody fired in time.`
	);
	return true;
}

function shuffleWord(word) {
	if (word.length < 2) return word;
	let shuffled = word;
	for (let attempt = 0; attempt < 5 && shuffled === word; attempt += 1) {
		shuffled = [...word].sort(() => Math.random() - 0.5).join('');
	}
	return shuffled;
}

function randomEntry(entries) {
	return entries[Math.floor(Math.random() * entries.length)];
}

module.exports = {
	handleGunfightInteraction,
	runCustomGame,
	shuffleWord
};
