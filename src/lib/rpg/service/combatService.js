const { recordRpgEvent } = require('../growth');
const { recordSeasonVictory, syncAchievements } = require('../playerGrowth');
const { balanceEnemyDamage, balancePlayerDamage, guaranteedMobLoot } = require('../combatBalance');
const {
	RpgError,
	addInventoryItem,
	addXp,
	advanceQuest,
	decrementInventoryItem,
	encounters,
	getDamageTuning,
	getEffectiveMaxHp,
	getEffectiveStats,
	getEncounterById,
	getEncounterMatchup,
	getStanceBonus,
	items,
	markBossDefeated,
	progressQuestKill,
	randomInt,
	regions,
	requireProfile,
	restoreHp,
	rollEncounter,
	rollLoot,
	saveProfile
} = require('./core');

async function startAdventure(guildId, userId) {
	const profile = await requireProfile(guildId, userId);
	const recoveredHp = restoreHp(profile);
	const regionEncounters = (encounters[profile.region] || encounters['broken-gate']).filter((encounter) => !encounter.boss);
	const encounter = rollEncounter(regionEncounters);
	await saveProfile(profile);
	await recordRpgEvent({ guildId, userId, event: 'first_adventure' });
	return { profile, encounter, region: regions[profile.region], recoveredHp };
}

async function resolveAdventureTurn(guildId, userId, battle, stance) {
	const profile = await requireProfile(guildId, userId);
	const encounter = getEncounterById(battle.encounterId);
	if (encounter.boss && stance === 'flee') throw new RpgError(`${encounter.name} has sealed the room. You cannot flee this fight.`);

	const stats = getEffectiveStats(profile);
	const usingSalve = stance === 'salve';
	const stanceBonus = usingSalve ? { damage: 0, guard: 1, loot: 0 } : getStanceBonus(stance, stats);
	const matchup = getEncounterMatchup(profile, encounter);
	const effectiveMaxHp = getEffectiveMaxHp(profile);
	const currentPlayerHp = Math.min(battle.playerHp ?? profile.hp, effectiveMaxHp);
	let recoveredHp = 0;
	if (usingSalve) {
		const salve = (profile.inventory || []).find((entry) => entry.itemId === 'star_salve' && entry.quantity > 0);
		if (!salve) throw new RpgError('You do not have a Star Salve to use.');
		if (currentPlayerHp >= effectiveMaxHp) throw new RpgError('Your HP is already full. Save the Star Salve for when you are injured.');
		recoveredHp = Math.min(items.star_salve.stats.hp, effectiveMaxHp - currentPlayerHp);
		decrementInventoryItem(profile, 'star_salve');
	}
	const escaped = !encounter.boss && stance === 'flee' && Math.random() * 100 < Math.min(85, 45 + Math.floor(stats.speed / 4));
	if (escaped) {
		await saveProfile(profile);
		return {
			profile,
			encounter,
			crit: false,
			damage: 0,
			enemyDamage: 0,
			enemyHp: battle.enemyHp ?? encounter.hp,
			playerHp: Math.min(battle.playerHp ?? profile.hp, getEffectiveMaxHp(profile)),
			escaped: true,
			won: false,
			lost: false,
			done: true
		};
	}

	const crit = !usingSalve && randomInt(1, 100) <= Math.min(35, 5 + Math.floor(stats.luck / 8));
	const damageTuning = getDamageTuning(encounter);
	const stanceDamage = encounter.boss ? stanceBonus.damage : Math.min(stanceBonus.damage, 1.45);
	const calculatedDamage =
		stance === 'flee' || usingSalve ? 0 : calculateDamage(stats, stanceDamage, matchup, damageTuning, crit, encounter.defense);
	const damage = balancePlayerDamage(encounter, stance, calculatedDamage);
	const nextEnemyHp = Math.max((battle.enemyHp ?? encounter.hp) - damage, 0);
	const calculatedEnemyDamage = nextEnemyHp > 0 ? calculateEnemyDamage(encounter, stats, matchup, stanceBonus) : 0;
	const enemyDamage = balanceEnemyDamage(encounter, stance, calculatedEnemyDamage, effectiveMaxHp);
	const nextPlayerHp = Math.max(Math.min(currentPlayerHp + recoveredHp, effectiveMaxHp) - enemyDamage, 0);
	const won = nextEnemyHp <= 0;
	const lost = nextPlayerHp <= 0;
	profile.hp = lost ? 1 : Math.min(Math.max(nextPlayerHp, 1), effectiveMaxHp);

	const result = {
		profile,
		encounter,
		crit,
		damage,
		enemyDamage,
		recoveredHp,
		usedItem: usingSalve ? 'star_salve' : null,
		enemyHp: nextEnemyHp,
		playerHp: profile.hp,
		won,
		lost,
		done: won || lost
	};
	if (won) applyVictory(profile, encounter, stats, stanceBonus, result);
	else if (lost) {
		profile.battlesLost += 1;
		Object.assign(result, { gold: 0, xp: 0, loot: null });
	}

	await saveProfile(profile);
	if (won) await recordVictory(guildId, userId, profile, result);
	return result;
}

async function prepareBossFight(guildId, userId) {
	const profile = await requireProfile(guildId, userId);
	const recoveredHp = restoreHp(profile);
	await saveProfile(profile);
	return { profile, recoveredHp };
}

async function resolveAdventure(guildId, userId, encounterId, stance) {
	const profile = await requireProfile(guildId, userId);
	const encounter = getEncounterById(encounterId);
	const stats = getEffectiveStats(profile);
	const stanceBonus = getStanceBonus(stance, stats);
	const matchup = getEncounterMatchup(profile, encounter);
	if (stance === 'flee' && Math.random() * 100 < Math.min(85, 45 + Math.floor(stats.speed / 4))) {
		await saveProfile(profile);
		return { profile, encounter, escaped: true };
	}

	const playerRoll = stats.attack * 1.7 + stats.defense * 0.65 + stats.speed * 0.35 + stats.focus * 0.45 + stats.luck * 0.25 + randomInt(80, 180);
	const enemyRoll = encounter.hp * 0.18 + encounter.attack * 1.15 + encounter.defense * 0.85 + randomInt(60, 150);
	const crit = randomInt(1, 100) <= Math.min(35, 5 + Math.floor(stats.luck / 8));
	const damageTuning = getDamageTuning(encounter);
	const stanceDamage = encounter.boss ? stanceBonus.damage : Math.min(stanceBonus.damage, 1.45);
	const damage = calculateDamage(stats, stanceDamage, matchup, damageTuning, crit, encounter.defense);
	const enemyDamage = Math.max(Math.round(((encounter.attack + randomInt(18, 76)) * matchup.incoming - stats.defense) / stanceBonus.guard), 0);
	const won = playerRoll + damage >= enemyRoll;
	const effectiveMaxHp = getEffectiveMaxHp(profile);

	if (won) {
		const result = { profile, encounter, won, crit, damage, enemyDamage: Math.floor(enemyDamage / 2) };
		applyVictory(profile, encounter, stats, stanceBonus, result);
		profile.hp = Math.min(effectiveMaxHp, Math.max(profile.hp - Math.floor(enemyDamage / 2), 1));
		await saveProfile(profile);
		await recordVictory(guildId, userId, profile, result);
		return result;
	}

	profile.battlesLost += 1;
	profile.hp = Math.max(Math.min(profile.hp, effectiveMaxHp) - enemyDamage, 1);
	await saveProfile(profile);
	return { profile, encounter, won, crit, damage, enemyDamage, gold: 0, xp: 0, loot: null };
}

function calculateDamage(stats, stanceDamage, matchup, tuning, crit, defense) {
	return Math.max(
		Math.round(
			(stats.attack * stanceDamage * matchup.damage * tuning.scale +
				stats.focus * tuning.focus +
				stats.speed * tuning.speed +
				randomInt(tuning.randomMin, tuning.randomMax)) *
				(crit ? tuning.crit : 1)
		) - defense,
		1
	);
}

function calculateEnemyDamage(encounter, stats, matchup, stanceBonus) {
	const rawDamage = Math.max((encounter.attack + randomInt(18, 76)) * matchup.incoming, 1);
	const armorFloor = rawDamage * (encounter.boss ? 0.18 : 0.08);
	const afterDefense = Math.max(rawDamage - stats.defense, armorFloor);
	return Math.max(Math.round(afterDefense / stanceBonus.guard), 1);
}

function applyVictory(profile, encounter, stats, stanceBonus, result) {
	const gold = randomInt(encounter.gold[0], encounter.gold[1]);
	const loot = guaranteedMobLoot(profile, encounter, rollLoot(encounter, stats.luck + stanceBonus.loot), randomInt);
	profile.gold += gold;
	profile.battlesWon += 1;
	if (encounter.boss) markBossDefeated(profile, encounter.id);
	if (loot) addInventoryItem(profile, loot);
	addXp(profile, encounter.xp);
	progressQuestKill(profile, encounter.id);
	advanceQuest(profile, loot);
	Object.assign(result, { gold, xp: encounter.xp, loot });
}

async function recordVictory(guildId, userId, profile, result) {
	await recordRpgEvent({ guildId, userId, event: 'first_victory' });
	await recordSeasonVictory(userId);
	const achievementResult = await syncAchievements(profile);
	result.unlockedAchievements = achievementResult.newlyUnlocked;
	result.achievementRewards = achievementResult.rewards;
	result.profile = achievementResult.profile;
}

module.exports = { prepareBossFight, resolveAdventure, resolveAdventureTurn, startAdventure };
