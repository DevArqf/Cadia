const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { buildBossBattlePanel, buildEncounterPanel } = require('../src/commands/Systems/RPG System/rpg');

const profile = {
	name: 'Aster',
	classId: 'vanguard',
	hp: 500,
	maxHp: 850,
	stats: { hp: 850 },
	equipment: {},
	inventory: [{ itemId: 'star_salve', quantity: 2 }]
};
const encounter = {
	id: 'rust-hound',
	name: 'Rust Hound',
	hp: 760,
	attack: 78,
	defense: 32
};
const region = { name: 'The Broken Gate' };

test('mob and boss combat panels expose the owned Star Salve action', () => {
	const state = { enemyHp: 600, playerHp: 500, turn: 2, lastResult: null };
	const mob = JSON.stringify(buildEncounterPanel(profile, encounter, region, 'mob-battle', state).toJSON());
	const boss = JSON.stringify(buildBossBattlePanel(profile, { ...encounter, boss: true }, region, state, 'boss-battle', 'boss.png').toJSON());

	assert.match(mob, /Use Salve \(2\)/);
	assert.match(mob, /restores \*\*260 HP\*\*/);
	assert.match(boss, /Use Salve \(2\)/);
});

test('combat panels disable Star Salve at full HP', () => {
	const state = { enemyHp: 600, playerHp: 850, turn: 0, lastResult: null };
	const payload = buildEncounterPanel(profile, encounter, region, 'mob-battle', state).toJSON();
	const buttons = payload.components.flatMap((component) => component.components || []);
	const salve = buttons.find((button) => button.label?.startsWith('Use Salve'));

	assert.ok(salve);
	assert.equal(salve.disabled, true);
});
