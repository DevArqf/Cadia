const {
	Connect4,
	FindEmoji,
	Flood,
	GuessThePokemon,
	Hangman,
	MatchPairs,
	Minesweeper,
	RockPaperScissors,
	Slots,
	Snake,
	TicTacToe,
	TwoZeroFourEight,
	Wordle
} = require('discord-gamecord');
const { MessageFlags } = require('discord.js');
const { color, emojis } = require('../../config');

const singlePlayerGames = {
	'find-emoji': () => [
		FindEmoji,
		{
			embed: {
				title: '> Cadia Minigame - Find Emoji',
				color: color.default,
				description: 'Remember the emojis from the board below',
				findDescription: 'Find the {emoji} emoji before the time runs out'
			},
			hideEmojiTime: 5000,
			emojis: ['\u{1F349}', '\u{1F347}', '\u{1F34A}', '\u{1F34B}', '\u{1F96D}', '\u{1F34E}', '\u{1F34F}', '\u{1F95D}'],
			winMessage: `> ${emojis.custom.tada1} **You won!** You selected the correct emoji. {emoji}`,
			loseMessage: `> ${emojis.custom.fail} **You lost!** You selected the wrong emoji. {emoji}`
		}
	],
	2048: () => [
		TwoZeroFourEight,
		{
			embed: { title: '> Cadia Minigame - 2048', color: color.default },
			emojis: { up: '\u2B06\uFE0F', down: '\u2B07\uFE0F', left: '\u2B05\uFE0F', right: '\u27A1\uFE0F' }
		}
	],
	flood: () => [
		Flood,
		{
			embed: { title: '> Cadia Minigame - Flood', color: color.default },
			difficulty: 8,
			emojis: ['\u{1F7E5}', '\u{1F7E6}', '\u{1F7E7}', '\u{1F7EA}', '\u{1F7E9}'],
			winMessage: `> ${emojis.custom.tada1} **You won!** You took **{turns}** turns.`,
			loseMessage: `> ${emojis.custom.fail} **You lost!** You took **{turns}** turns.`
		}
	],
	'guess-the-pokemon': () => [
		GuessThePokemon,
		{
			embed: { title: "> Cadia Minigame - Who's The Pokemon", color: color.default },
			winMessage: `> ${emojis.custom.tada1} **You guessed it right!** It was {pokemon}.`,
			loseMessage: `> ${emojis.custom.fail} Better luck next time! It was {pokemon}.`,
			errMessage: `${emojis.custom.fail} Unable to fetch Pokemon data. Please try again later.`
		}
	],
	hangman: () => [
		Hangman,
		{
			embed: { title: '> Cadia Minigame - Hangman', color: color.default },
			hangman: {
				hat: '\u{1F3A9}',
				head: '\u{1F468}\u200D\u{1F9B0}',
				shirt: '\u{1F455}',
				pants: '\u{1FA73}',
				boots: '\u{1F97E}\u{1F97E}'
			},
			timeWords: 'all',
			winMessage: `> ${emojis.custom.emoji2} You won! The word was **{word}**.`,
			loseMessage: `> ${emojis.custom.fail} **You lost.** The word was **{word}**.`
		}
	],
	'match-pairs': () => [
		MatchPairs,
		{
			embed: {
				title: '> Cadia Minigame - Match Pairs',
				color: color.default,
				description: '**Click the buttons to match emojis with their pairs.**'
			},
			emojis: ['\u{1F349}', '\u{1F347}', '\u{1F34A}', '\u{1F96D}', '\u{1F34E}', '\u{1F34F}', '\u{1F95D}', '\u{1F965}'],
			winMessage: `> ${emojis.custom.emoji2} **You won!** You turned \`{tilesTurned}\` tiles.`,
			loseMessage: `${emojis.custom.fail} **You lost!** You turned \`{tilesTurned}\` tiles.`
		}
	],
	minesweeper: () => [
		Minesweeper,
		{
			embed: {
				title: '> Cadia Minigame - Minesweeper',
				color: color.default,
				description: 'Reveal every safe block without selecting a mine.'
			},
			emojis: { flag: '\u{1F6A9}', mine: '\u{1F4A3}' },
			mines: 5,
			winMessage: `> ${emojis.custom.tada2} **You won!** All mines were avoided.`,
			loseMessage: `> ${emojis.custom.fail} **You hit a mine.**`
		}
	],
	slots: () => [
		Slots,
		{
			embed: { title: '> Cadia Minigame - Slot Machine', color: color.default },
			slots: ['\u{1F347}', '\u{1F34A}', '\u{1F34B}', '\u{1F34C}']
		}
	],
	snake: () => [
		Snake,
		{
			embed: { title: '> Cadia Minigame - Snake', overTitle: 'Game Over', color: color.default },
			emojis: {
				board: '\u2B1B',
				food: '\u{1F34E}',
				up: '\u2B06\uFE0F',
				down: '\u2B07\uFE0F',
				left: '\u2B05\uFE0F',
				right: '\u27A1\uFE0F'
			},
			snake: { head: '\u{1F7E2}', body: '\u{1F7E9}', tail: '\u{1F7E2}', over: '\u{1F480}' },
			foods: ['\u{1F34E}', '\u{1F347}', '\u{1F34A}', '\u{1F95D}', '\u{1F955}'],
			stopButton: 'Stop'
		}
	],
	wordle: () => [
		Wordle,
		{
			embed: { title: '> Cadia Minigame - Wordle', color: color.default },
			customWord: null,
			winMessage: `> ${emojis.custom.tada1} **You won!** The word was **{word}**.`,
			loseMessage: `> ${emojis.custom.fail} **You lost!** The word was **{word}**.`
		}
	]
};

const opponentGames = {
	'connect-four': {
		Game: Connect4,
		option: 'opponent',
		config: {
			embed: {
				title: '> Cadia Minigame - Connect Four',
				rejectTitle: 'Cancelled Request',
				statusTitle: 'Status',
				overTitle: 'Game Over',
				color: color.default,
				rejectColor: color.default
			},
			emojis: { board: '<:C4Holder:1225498863947874334>', player1: '\u{1F534}', player2: '\u{1F7E1}' },
			turnMessage: '> {emoji} | **{player}**, it is your turn!',
			winMessage: `> ${emojis.custom.tada1} **{player}** won Connect Four!`,
			tieMessage: '> The game ended in a tie.'
		}
	},
	rps: {
		Game: RockPaperScissors,
		option: 'opponent',
		config: {
			embed: {
				title: 'Cadia Minigame - Rock Paper Scissors',
				rejectTitle: 'Cancelled Request',
				statusTitle: 'Status',
				overTitle: 'Game Over',
				color: color.default,
				rejectColor: color.fail
			},
			buttons: { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' },
			emojis: { rock: '\u{1F311}', paper: '\u{1F4F0}', scissors: '\u2702\uFE0F' },
			pickMessage: '> You chose {emoji}.',
			winMessage: `> ${emojis.custom.tada1} **{player}** won Rock Paper Scissors!`,
			tieMessage: '> The game ended in a tie.'
		}
	},
	ttt: {
		Game: TicTacToe,
		option: 'opponent',
		config: {
			embed: {
				title: 'Cadia Minigame - Tic Tac Toe',
				rejectTitle: 'Cancelled Request',
				statusTitle: 'Status',
				overTitle: 'Game Over',
				color: color.default,
				rejectColor: color.fail
			},
			emojis: { xButton: '\u274C', oButton: '\u{1F535}', blankButton: '\u2796' },
			winMessage: `> ${emojis.custom.tada1} **{player}** won Tic Tac Toe!`,
			tieMessage: '> The game ended in a tie.'
		}
	}
};

async function runGamecordGame(interaction, subcommand) {
	if (singlePlayerGames[subcommand]) {
		const [Game, config] = singlePlayerGames[subcommand]();
		return start(new Game({ ...baseConfig(interaction), ...config }));
	}

	const definition = opponentGames[subcommand];
	if (!definition) return false;
	const opponent = interaction.options.getUser(definition.option, true);
	if (!(await validateOpponent(interaction, opponent))) return true;
	return start(
		new definition.Game({
			...baseConfig(interaction),
			...definition.config,
			opponent,
			mentionUser: true,
			timeoutTime: 120_000,
			rejectMessage: `${emojis.custom.fail} {opponent} denied the game request.`
		})
	);
}

function baseConfig(interaction) {
	return {
		message: interaction,
		isSlashGame: true,
		timeoutTime: 60_000,
		buttonStyle: 'PRIMARY',
		timeoutMessage: `> ${emojis.custom.fail} The game went unfinished.`,
		playerOnlyMessage: `${emojis.custom.forbidden} Only the active player can use these controls.`
	};
}

async function validateOpponent(interaction, opponent) {
	if (opponent.id === interaction.user.id) {
		await interaction.reply({ content: `${emojis.custom.fail} You cannot challenge yourself.`, flags: MessageFlags.Ephemeral });
		return false;
	}
	if (opponent.bot) {
		await interaction.reply({ content: `${emojis.custom.fail} You cannot challenge a bot.`, flags: MessageFlags.Ephemeral });
		return false;
	}
	return true;
}

async function start(game) {
	await game.startGame();
	return true;
}

module.exports = {
	runGamecordGame
};
