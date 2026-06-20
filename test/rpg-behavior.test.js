const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { SlashCommandBuilder } = require('discord.js');
const { classes, encounters, items, origins, regions } = require('../src/lib/rpg/data');
const { registerRpgCommand } = require('../src/lib/rpg/command/register');
const { dispatchRpgCommand } = require('../src/lib/rpg/command/router');
const { clearActiveAction, getActiveAction, setActiveAction } = require('../src/lib/rpg/command/sessions');
const service = require('../src/lib/rpg/service');
const { shouldDeferRpgCommand } = require('../src/commands/Systems/RPG System/rpg');

test('RPG registration preserves public and developer subcommands', () => {
	let command;
	registerRpgCommand(
		{
			registerChatInputCommand(callback) {
				command = callback(new SlashCommandBuilder()).toJSON();
			}
		},
		'RPG',
		{ classes, encounters, items, origins, regions }
	);

	const names = command.options.map((option) => option.name);
	assert.ok(names.includes('adventure'));
	assert.ok(names.includes('inventory'));
	assert.ok(names.includes('leaderboard'));
	assert.ok(!names.includes('global-leaderboard'));
	assert.ok(names.includes('share'));
	assert.ok(names.includes('server-boss'));
	assert.ok(names.includes('season'));
	assert.ok(names.includes('refer'));
	assert.ok(names.includes('admin'));
	const admin = command.options.find((option) => option.name === 'admin');
	assert.ok(admin.options.some((option) => option.name === 'boss'));
	assert.ok(admin.options.some((option) => option.name === 'analytics'));
	const analytics = admin.options.find((option) => option.name === 'analytics');
	const view = analytics.options.find((option) => option.name === 'view');
	assert.ok(view.choices.some((choice) => choice.value === 'growth'));
});

test('RPG router offers the tutorial before dispatching other commands', async () => {
	const calls = [];
	const interaction = interactionFor('profile');
	const handlers = {
		offerTutorial: async () => calls.push('tutorial'),
		profile: async () => calls.push('profile')
	};
	const fakeService = {
		RpgError: Error,
		shouldOfferTutorial: async () => true
	};

	await dispatchRpgCommand(interaction, handlers, fakeService);
	assert.deepEqual(calls, ['tutorial']);
});

test('RPG router dispatches admin groups and normal subcommands', async () => {
	const calls = [];
	const fakeService = { RpgError: Error, shouldOfferTutorial: async () => false };
	const handlers = {
		admin: async (_, subcommand) => calls.push(`admin:${subcommand}`),
		profile: async () => calls.push('profile')
	};

	await dispatchRpgCommand(interactionFor('inspect', 'admin'), handlers, fakeService);
	await dispatchRpgCommand(interactionFor('profile'), handlers, fakeService);
	assert.deepEqual(calls, ['admin:inspect', 'profile']);
});

test('RPG active actions expire and remain isolated by guild and user', () => {
	setActiveAction('guild-a', 'user-a', 'exploring', 1_000);
	setActiveAction('guild-a', 'user-b', 'battle', 1_000);

	assert.equal(getActiveAction('guild-a', 'user-a', 2_000).type, 'exploring');
	assert.equal(getActiveAction('guild-a', 'user-b', 2_000).type, 'battle');
	assert.equal(getActiveAction('guild-a', 'user-a', 122_000), null);
	assert.equal(getActiveAction('guild-a', 'user-b', 122_000).type, 'battle');
	clearActiveAction('guild-a', 'user-b');
	assert.equal(getActiveAction('guild-a', 'user-b', 2_000), null);
});

test('RPG progression and travel rules preserve rank and boss gates', () => {
	assert.equal(service.xpForRank(1), 100);
	assert.equal(service.xpForRank(2), 135);

	const lockedProfile = { level: 1, defeatedBosses: [] };
	const unlockedProfile = { level: 20, defeatedBosses: ['harlequin', 'mossbound-regent'] };
	const region = service.regions['ashwood-outskirts'];

	assert.equal(service.canTravel(lockedProfile, region).ok, false);
	assert.equal(service.canTravel(unlockedProfile, region).ok, true);
});

test('season commands are acknowledged before tutorial and database work', () => {
	assert.equal(shouldDeferRpgCommand(interactionFor('season')), true);
	assert.equal(shouldDeferRpgCommand(interactionFor('profile')), false);
});

function interactionFor(subcommand, group = null) {
	return {
		guild: { id: 'guild' },
		user: { id: 'user' },
		options: {
			getSubcommand: () => subcommand,
			getSubcommandGroup: () => group
		}
	};
}
