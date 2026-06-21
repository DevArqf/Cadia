const assert = require('node:assert/strict');
const test = require('node:test');

const { balanceEnemyDamage, balancePlayerDamage, guaranteedMobLoot, mobCounterShares, mobDamageShares } = require('../src/lib/rpg/combatBalance');
const { classes, encounters } = require('../src/lib/rpg/data');

test('every regional mob can be defeated safely by every class using normal combat stances', () => {
	const mobs = Object.values(encounters)
		.flat()
		.filter((encounter) => !encounter.boss);

	for (const mob of mobs) {
		for (const archetype of Object.values(classes)) {
			for (const stance of ['attack', 'skill', 'defend']) {
				const damage = balancePlayerDamage(mob, stance, 1);
				const turnsToWin = Math.ceil(mob.hp / damage);
				const counterDamage = balanceEnemyDamage(mob, stance, Number.MAX_SAFE_INTEGER, archetype.stats.hp);
				const totalDamageTaken = counterDamage * (turnsToWin - 1);

				assert.ok(turnsToWin <= 8, `${archetype.name} needs ${turnsToWin} ${stance} turns against ${mob.name}`);
				assert.ok(totalDamageTaken < archetype.stats.hp, `${archetype.name} would lose to ${mob.name} with ${stance} before earning loot`);
			}
		}
	}
});

test('regional farming guarantees progress without changing boss balance', () => {
	const mob = encounters['broken-gate'][0];
	const boss = encounters['broken-gate'].find((encounter) => encounter.boss);

	assert.equal(balancePlayerDamage(mob, 'attack', 1), Math.ceil(mob.hp * mobDamageShares.attack));
	assert.equal(balanceEnemyDamage(mob, 'defend', 999, 850), Math.floor(850 * mobCounterShares.defend));
	assert.equal(balancePlayerDamage(boss, 'attack', 1), 1);
	assert.equal(balanceEnemyDamage(boss, 'defend', 999, 850), 999);
});

test('mob loot has a three-victory pity guarantee while preserving normal drops', () => {
	const mob = encounters['broken-gate'][1];
	const chooseFirst = (minimum) => minimum;

	assert.equal(guaranteedMobLoot({ battlesWon: 0 }, mob, null, chooseFirst), null);
	assert.equal(guaranteedMobLoot({ battlesWon: 1 }, mob, null, chooseFirst), null);
	assert.equal(guaranteedMobLoot({ battlesWon: 2 }, mob, null, chooseFirst), mob.loot[0]);
	assert.equal(guaranteedMobLoot({ battlesWon: 2 }, mob, 'existing-drop', chooseFirst), 'existing-drop');
});
