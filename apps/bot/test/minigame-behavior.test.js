const assert = require('node:assert/strict');
const test = require('node:test');
const { SlashCommandBuilder } = require('discord.js');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { registerMinigameCommand } = require('../src/lib/minigames/register');
const { shuffleWord } = require('../src/lib/minigames/custom');

test('minigame registration exposes every routed game name', () => {
	let command;
	registerMinigameCommand(
		{
			registerChatInputCommand(callback) {
				command = callback(new SlashCommandBuilder()).toJSON();
			}
		},
		'Games'
	);

	const names = command.options.map((option) => option.name);
	assert.ok(names.includes('slots'));
	assert.ok(names.includes('gunfight'));
	assert.ok(names.includes('word-shuffle'));
	assert.equal(new Set(names).size, names.length);
});

test('word shuffle preserves the original letters', () => {
	const original = 'waterfall';
	const shuffled = shuffleWord(original);

	assert.equal([...shuffled].sort().join(''), [...original].sort().join(''));
	assert.equal(shuffled.length, original.length);
});
