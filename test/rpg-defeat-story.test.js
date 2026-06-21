const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { createDefeatStory } = require('../src/lib/rpg/defeatStory');
const { buildBattleResultPanel } = require('../src/commands/Systems/RPG System/rpg');

test('mob defeats tell how the Warden fell and explain recovery', () => {
	const story = createDefeatStory({
		profile: { name: 'Aster' },
		encounter: { id: 'rust-hound', name: 'Rust Hound', boss: false }
	});

	assert.match(story, /Rust Hound/);
	assert.match(story, /Aster/);
	assert.match(story, /final blow/i);
	assert.match(story, /back from death/i);
	assert.match(story, /1 HP/);
});

test('boss defeats use boss-specific killing-blow stories', () => {
	const story = createDefeatStory({
		profile: { name: 'Aster' },
		encounter: { id: 'harlequin', name: 'Harlequin', boss: true }
	});

	assert.match(story, /cruel performance/i);
	assert.match(story, /killing strike/i);
	assert.match(story, /battle is lost/i);
});

test('unknown encounters receive an appropriate fallback defeat story', () => {
	const mobStory = createDefeatStory({
		profile: { name: 'Aster' },
		encounter: { id: 'future-mob', name: 'Future Mob', boss: false }
	});
	const bossStory = createDefeatStory({
		profile: { name: 'Aster' },
		encounter: { id: 'future-boss', name: 'Future Boss', boss: true }
	});

	assert.match(mobStory, /counterattack/i);
	assert.match(bossStory, /killing blow/i);
});

test('defeat result panels cannot display the encounter-cleared title', () => {
	const panel = buildBattleResultPanel({
		won: false,
		lost: true,
		damage: 42,
		enemyDamage: 80,
		crit: false,
		profile: { name: 'Aster', hp: 1, maxHp: 850 },
		encounter: { id: 'rust-hound', name: 'Rust Hound', boss: false }
	});
	const payload = JSON.stringify(panel.toJSON());

	assert.match(payload, /Warden Defeated/);
	assert.match(payload, /fell to Rust Hound/);
	assert.doesNotMatch(payload, /Encounter Cleared/);
	assert.match(payload, /Rewards.*None/);
});
