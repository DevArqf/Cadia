const subcommands = [
	['find-emoji', 'Play a game of Find Emoji. TIP: Have good memory...'],
	['2048', 'Play a game of 2048. TIP: Just know how to count ;)'],
	['flood', 'Play a game of Flood. TIP: Select the color you see the most ;)'],
	['guess-the-pokemon', 'Play Guess The Pokemon. TIP: Watch Pokemon ;)'],
	['fast-type', 'Play Fast-Type. TIP: Type quickly and accurately.'],
	['word-shuffle', 'Play Word Shuffle. TIP: Read a lot of books!'],
	['hangman', "Play Hangman. TIP: Don't get stuck on the word ;)"],
	['match-pairs', 'Play Match Pairs. TIP: Remember the board.'],
	['minesweeper', 'Play Minesweeper. TIP: Watch out for mines.'],
	['slots', 'Play Slots. TIP: Bring some luck.'],
	['snake', 'Play Snake. TIP: Plan your route.'],
	['wordle', 'Play Wordle. TIP: Know your five-letter words.']
];

const opponentSubcommands = [
	['connect-four', 'opponent', 'Play Connect Four. TIP: Strategy is key!'],
	['rps', 'opponent', 'Play Rock Paper Scissors.'],
	['ttt', 'opponent', 'Play Tic Tac Toe.'],
	['gunfight', 'player', 'Challenge another user to a gunfight.']
];

function registerMinigameCommand(registry, description) {
	registry.registerChatInputCommand((builder) => {
		builder.setName('minigame').setDescription(description);

		for (const [name, commandDescription] of subcommands) {
			builder.addSubcommand((command) => command.setName(name).setDescription(commandDescription));
		}

		for (const [name, optionName, commandDescription] of opponentSubcommands) {
			builder.addSubcommand((command) =>
				command
					.setName(name)
					.setDescription(commandDescription)
					.addUserOption((option) => option.setName(optionName).setDescription('Select the user to challenge').setRequired(true))
			);
		}

		return builder;
	});
}

module.exports = {
	registerMinigameCommand
};
