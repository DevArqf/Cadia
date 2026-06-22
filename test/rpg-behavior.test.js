const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { SlashCommandBuilder } = require('discord.js');
const { achievements, badges, classes, encounters, items, origins, regions } = require('../src/lib/rpg/data');
const { registerRpgCommand } = require('../src/lib/rpg/command/register');
const { dispatchRpgCommand } = require('../src/lib/rpg/command/router');
const { clearActiveAction, getActiveAction, setActiveAction } = require('../src/lib/rpg/command/sessions');
const service = require('../src/lib/rpg/service');
const { buildProfilePanel, shouldDeferRpgCommand } = require('../src/commands/Systems/RPG System/rpg');

test('RPG registration preserves public and developer subcommands', () => {
	let command;
	registerRpgCommand(
		{
			registerChatInputCommand(callback) {
				command = callback(new SlashCommandBuilder()).toJSON();
			}
		},
		'RPG',
		{ achievements, badges, classes, encounters, items, origins, regions }
	);

	const names = command.options.map((option) => option.name);
	assert.ok(names.includes('adventure'));
	assert.ok(names.includes('inventory'));
	assert.ok(names.includes('leaderboard'));
	assert.ok(names.includes('achievements'));
	assert.ok(names.includes('badge'));
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
	assert.equal(shouldDeferRpgCommand(interactionFor('achievements')), true);
	assert.equal(shouldDeferRpgCommand(interactionFor('profile')), false);
});

test('limited rewards are functional items and their badges are centrally defined', () => {
	assert.equal(items.stormglass_aura.slot, 'armor');
	assert.equal(items.gatebound_crest.slot, 'charm');
	assert.equal(items.worldbreaker_sigil.slot, 'weapon');
	assert.equal(items.stormglass_aura.emoji, '<:StormglassAura:1518462673485041714>');
	assert.equal(items.gatebound_crest.emoji, '<:GateboundCrest:1518462671953989713>');
	assert.equal(items.worldbreaker_sigil.emoji, '<:WorldbreakerSigil:1518462690714980543>');
	for (const item of [items.stormglass_aura, items.gatebound_crest, items.worldbreaker_sigil]) {
		assert.ok(Object.values(item.stats).some((amount) => amount > 0));
	}
	for (const badge of Object.values(badges)) {
		assert.ok(badge.description);
		assert.ok(badge.source);
		assert.ok(badge.emojiKey);
		assert.match(badge.image, /\.png$/);
		assert.equal('symbol' in badge, false);
	}
	for (const achievement of achievements) {
		assert.ok(achievement.rewards.gold > 0);
		assert.ok(badges[achievement.badgeId]);
	}
});

test('limited equipment contributes real combat stats when equipped', () => {
	const stats = service.getEffectiveStats({
		maxHp: 100,
		stats: { hp: 100, attack: 10, defense: 10, speed: 10, luck: 10, focus: 10 },
		equipment: {
			weapon: 'worldbreaker_sigil',
			armor: 'stormglass_aura',
			charm: 'gatebound_crest'
		}
	});

	assert.equal(stats.attack, 138);
	assert.equal(stats.defense, 122);
	assert.equal(stats.speed, 22);
	assert.equal(stats.luck, 48);
	assert.equal(stats.focus, 92);
	assert.equal(stats.hp, 420);
});

test('RPG profiles display the selected badge', () => {
	const profilePanel = buildProfilePanel(
		{
			characterId: 'RPG-ABC123',
			name: 'Aster',
			classId: 'vanguard',
			origin: 'blackforge',
			level: 5,
			xp: 20,
			hp: 850,
			maxHp: 850,
			stats: classes.vanguard.stats,
			region: 'broken-gate',
			gold: 100,
			relicShards: 1,
			equipment: {},
			updatedAt: Date.now()
		},
		'<@user>',
		{ featuredBadge: 'worldbreaker', badges: ['worldbreaker'] }
	);

	assert.match(JSON.stringify(profilePanel.toJSON()), /Featured Badge: Worldbreaker/);
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
