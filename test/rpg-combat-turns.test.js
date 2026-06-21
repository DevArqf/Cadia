const assert = require('node:assert/strict');
const test = require('node:test');

test('surviving mobs counterattack after attack, skill, defend, and failed flee turns', async () => {
	const attack = await resolveTurn({ stance: 'attack' });
	const skill = await resolveTurn({ stance: 'skill' });
	const defend = await resolveTurn({ stance: 'defend' });
	const failedFlee = await resolveTurn({ stance: 'flee', random: 0.99 });

	for (const result of [attack, skill, defend, failedFlee]) {
		assert.equal(result.done, false);
		assert.ok(result.enemyDamage > 0);
		assert.ok(result.playerHp < 250);
	}
	assert.equal(failedFlee.damage, 0);
	assert.ok(defend.enemyDamage < attack.enemyDamage);
});

test('a defeated mob cannot counterattack after the killing blow', async () => {
	const result = await resolveTurn({ stance: 'attack', enemyHp: 1 });

	assert.equal(result.won, true);
	assert.equal(result.done, true);
	assert.equal(result.enemyHp, 0);
	assert.equal(result.enemyDamage, 0);
	assert.equal(result.playerHp, 250);
});

test('a successful escape ends the turn before the mob counterattacks', async () => {
	const result = await resolveTurn({ stance: 'flee', random: 0 });

	assert.equal(result.escaped, true);
	assert.equal(result.done, true);
	assert.equal(result.damage, 0);
	assert.equal(result.enemyDamage, 0);
	assert.equal(result.playerHp, 250);
});

test('admin-maxed defense cannot reduce a surviving boss counterattack to zero', async () => {
	const attack = await resolveTurn({ stance: 'attack', boss: true, defense: 1_500, encounterAttack: 185 });
	const defend = await resolveTurn({ stance: 'defend', boss: true, defense: 1_500, encounterAttack: 185 });

	assert.equal(attack.done, false);
	assert.ok(attack.enemyDamage > 0);
	assert.ok(attack.playerHp < 2_000);
	assert.ok(defend.enemyDamage > 0);
	assert.ok(defend.enemyDamage < attack.enemyDamage);
});

async function resolveTurn({ stance, enemyHp = 500, random = 0.99, boss = false, defense = 20, encounterAttack = 70 }) {
	const profile = {
		userId: 'user',
		hp: boss ? 2_000 : 250,
		battlesWon: 0,
		battlesLost: 0,
		gold: 0,
		xp: 0,
		equipment: {},
		defeatedBosses: []
	};
	const encounter = {
		id: 'test-mob',
		name: boss ? 'Test Boss' : 'Test Mob',
		hp: 500,
		attack: encounterAttack,
		defense: 5,
		gold: [1, 1],
		xp: 1,
		loot: [],
		boss
	};
	const paths = {
		core: require.resolve('../src/lib/rpg/service/core'),
		growth: require.resolve('../src/lib/rpg/growth'),
		playerGrowth: require.resolve('../src/lib/rpg/playerGrowth'),
		combat: require.resolve('../src/lib/rpg/service/combatService')
	};
	const originals = Object.fromEntries(Object.entries(paths).map(([key, modulePath]) => [key, require.cache[modulePath]]));
	const originalRandom = Math.random;

	require.cache[paths.core] = moduleWith({
		RpgError: Error,
		addInventoryItem: () => null,
		addXp: () => null,
		advanceQuest: () => null,
		encounters: {},
		getDamageTuning: () => ({ scale: 0.62, focus: 0.14, speed: 0.08, randomMin: 15, randomMax: 55, crit: 1.45 }),
		getEffectiveMaxHp: () => (boss ? 2_000 : 250),
		getEffectiveStats: () => ({ attack: 30, defense, speed: 15, luck: 0, focus: 15 }),
		getEncounterById: () => encounter,
		getEncounterMatchup: () => ({ damage: 1, incoming: 1 }),
		getStanceBonus: (selectedStance, stats) =>
			({
				attack: { damage: 1.15, guard: 0.85, loot: 0 },
				skill: { damage: 1 + stats.focus / 20, guard: 1, loot: 4 },
				defend: { damage: 0.75, guard: 1.45, loot: 1 },
				flee: { damage: 0, guard: 1, loot: 0 }
			})[selectedStance],
		markBossDefeated: () => null,
		progressQuestKill: () => null,
		randomInt: (min) => min,
		regions: {},
		requireProfile: async () => profile,
		restoreHp: () => 0,
		rollEncounter: () => encounter,
		rollLoot: () => null,
		saveProfile: async (value) => value
	});
	require.cache[paths.growth] = moduleWith({ recordRpgEvent: async () => null });
	require.cache[paths.playerGrowth] = moduleWith({
		recordSeasonVictory: async () => null,
		syncAchievements: async () => ({ newlyUnlocked: [] })
	});
	delete require.cache[paths.combat];
	Math.random = () => random;

	try {
		const combat = require(paths.combat);
		return await combat.resolveAdventureTurn('guild', 'user', { encounterId: encounter.id, enemyHp, playerHp: profile.hp }, stance);
	} finally {
		Math.random = originalRandom;
		for (const [key, modulePath] of Object.entries(paths)) {
			if (originals[key]) require.cache[modulePath] = originals[key];
			else delete require.cache[modulePath];
		}
	}
}

function moduleWith(exports) {
	return { id: 'test-double', filename: 'test-double', loaded: true, exports };
}
