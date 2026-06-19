const { randomBytes } = require('node:crypto');
const { RpgAccessSchema } = require('../schemas/RPG System/rpgAccessSchema');
const { RpgProfileSchema } = require('../schemas/RPG System/rpgProfileSchema');
const { RpgTutorialSchema } = require('../schemas/RPG System/rpgTutorialSchema');
const { getMysqlError, isMysqlConnected } = require('../database/mysql');
const { classes, encounters, items, npcQuests, questSteps, regions } = require('./data');
const { recordRpgEvent } = require('./growth');

const xpPerLevel = 100;
const adminMaxRank = 100;
const adminMaxGold = 999_999_999;
const adminMaxShards = 999_999;
const adminMaxItemQuantity = 99;

async function getProfile(guildId, userId) {
	assertDatabaseReady();
	const profile = await RpgProfileSchema.findOne({ userId });
	return profile ? normalizeProfile(profile) : null;
}

async function hasRpgAccess(userId) {
	assertDatabaseReady();
	const access = await RpgAccessSchema.findOne({ userId });
	return Boolean(access?.enabled);
}

async function grantRpgAccess(userId, grantedBy) {
	assertDatabaseReady();
	validateDiscordUserId(userId);
	let access = await RpgAccessSchema.findOne({ userId });
	if (!access) access = new RpgAccessSchema({ userId, createdAt: Date.now() });
	access.enabled = true;
	access.grantedBy = grantedBy;
	access.revokedBy = null;
	access.updatedAt = Date.now();
	await access.save();
	return access;
}

async function revokeRpgAccess(userId, revokedBy) {
	assertDatabaseReady();
	validateDiscordUserId(userId);
	let access = await RpgAccessSchema.findOne({ userId });
	if (!access) access = new RpgAccessSchema({ userId, createdAt: Date.now() });
	access.enabled = false;
	access.revokedBy = revokedBy;
	access.updatedAt = Date.now();
	await access.save();
	return access;
}

async function getRpgAccess(userId) {
	assertDatabaseReady();
	validateDiscordUserId(userId);
	return RpgAccessSchema.findOne({ userId });
}

async function shouldOfferTutorial(guildId, userId) {
	assertDatabaseReady();
	const state = await RpgTutorialSchema.findOne({ userId });
	return !state || (!state.offered && !state.skipped && !state.completed);
}

async function markTutorialOffered(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true });
}

async function markTutorialStarted(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true, started: true });
}

async function markTutorialSkipped(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true, skipped: true, completed: false });
}

async function markTutorialCompleted(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true, skipped: false, completed: true });
}

async function updateTutorialState(guildId, userId, patch) {
	assertDatabaseReady();
	let state = await RpgTutorialSchema.findOne({ userId });
	if (!state) state = new RpgTutorialSchema({ guildId, userId, createdAt: Date.now() });
	if (!state.guildId) state.guildId = guildId;
	Object.assign(state, patch, { updatedAt: Date.now() });
	await state.save();
	if (patch.completed) await recordRpgEvent({ guildId, userId, event: 'tutorial_completed' });
	else if (patch.skipped) await recordRpgEvent({ guildId, userId, event: 'tutorial_skipped' });
	else if (patch.started) await recordRpgEvent({ guildId, userId, event: 'tutorial_started' });
	else if (patch.offered) await recordRpgEvent({ guildId, userId, event: 'tutorial_offered' });
	return state;
}

async function requireProfile(guildId, userId) {
	const profile = await getProfile(guildId, userId);
	if (!profile) throw new RpgError('Create a character first with `/rpg create`.');
	return profile;
}

async function createProfile(guildId, userId, name, classId, origin) {
	const existing = await getProfile(guildId, userId);
	if (existing) throw new RpgError('You already have an RPG character.');

	const archetype = classes[classId];
	if (!archetype) throw new RpgError('That class does not exist.');

	const stats = { ...archetype.stats };
	const profile = await RpgProfileSchema.create({
		guildId,
		userId,
		characterId: await generateCharacterId(),
		name,
		classId,
		origin,
		hp: stats.hp,
		maxHp: stats.hp,
		stats,
		gold: 25,
		defeatedBosses: [],
		activeQuest: null,
		completedQuests: [],
		inventory: [{ itemId: 'star_salve', quantity: 1 }],
		equipment: { weapon: null, armor: null, charm: null }
	});
	await recordRpgEvent({ guildId, userId, event: 'character_created' });

	return profile;
}

async function deleteProfile(guildId, userId) {
	assertDatabaseReady();
	return RpgProfileSchema.deleteOne({ userId });
}

async function getProfileByCharacterId(characterId) {
	assertDatabaseReady();
	const normalizedId = normalizeCharacterId(characterId);
	let profile = await RpgProfileSchema.findOne({ characterId: normalizedId });
	if (profile) return normalizeProfile(profile);

	const profiles = await RpgProfileSchema.find({});
	for (const entry of profiles) await normalizeProfile(entry);
	profile = await RpgProfileSchema.findOne({ characterId: normalizedId });
	if (!profile) throw new RpgError(`No RPG character found with ID \`${normalizedId}\`.`);
	return normalizeProfile(profile);
}

async function adminAddCurrency(characterId, currency, amount) {
	const profile = await getProfileByCharacterId(characterId);
	const value = Number(amount);
	if (!Number.isInteger(value) || value === 0) throw new RpgError('Amount must be a non-zero whole number.');

	if (currency === 'gold') profile.gold = Math.max((profile.gold || 0) + value, 0);
	else if (currency === 'shards') profile.relicShards = Math.max((profile.relicShards || 0) + value, 0);
	else if (currency === 'xp') {
		if (value > 0) addXp(profile, value);
		else profile.xp = Math.max((profile.xp || 0) + value, 0);
	} else if (currency === 'level' || currency === 'rank') {
		adjustRank(profile, value);
	} else throw new RpgError('Currency must be one of: gold, shards, xp, rank.');

	await saveProfile(profile);
	return profile;
}

async function adminAddItem(characterId, itemId, quantity = 1) {
	const profile = await getProfileByCharacterId(characterId);
	const item = items[itemId];
	if (!item) throw new RpgError('That item does not exist.');
	const amount = Number(quantity);
	if (!Number.isInteger(amount) || amount < 1) throw new RpgError('Quantity must be at least 1.');

	for (let i = 0; i < amount; i++) addInventoryItem(profile, itemId);
	await saveProfile(profile);
	return { profile, item, quantity: amount };
}

async function adminWipeCharacter(characterId) {
	const profile = await getProfileByCharacterId(characterId);
	const result = await RpgProfileSchema.deleteOne({ characterId: profile.characterId });
	return { profile, result };
}

async function adminMaxCharacter(characterId) {
	const profile = await getProfileByCharacterId(characterId);
	adjustRank(profile, adminMaxRank - (profile.level || 1));
	profile.xp = xpForRank(profile.level) - 1;
	profile.gold = adminMaxGold;
	profile.relicShards = adminMaxShards;
	profile.defeatedBosses = getBosses().map((boss) => boss.id);
	profile.region = Object.values(regions).sort((a, b) => b.unlockRank - a.unlockRank)[0]?.id || profile.region;
	profile.inventory = Object.keys(items).map((itemId) => ({ itemId, quantity: adminMaxItemQuantity }));
	profile.hp = getEffectiveMaxHp(profile);
	profile.questStep = questSteps.length - 1;
	profile.activeQuest = null;
	profile.completedQuests = npcQuests.map((quest) => quest.id);

	await saveProfile(profile);
	return {
		profile,
		itemCount: Object.keys(items).length,
		itemQuantity: adminMaxItemQuantity,
		rank: adminMaxRank
	};
}

async function adminAnalytics() {
	assertDatabaseReady();
	const profiles = await RpgProfileSchema.find({});
	const accessRecords = await RpgAccessSchema.find({});
	const tutorialRecords = await RpgTutorialSchema.find({});
	const now = Date.now();
	const totalBattles = sumBy(profiles, (profile) => (profile.battlesWon || 0) + (profile.battlesLost || 0));
	const battlesWon = sumBy(profiles, (profile) => profile.battlesWon || 0);
	const battlesLost = sumBy(profiles, (profile) => profile.battlesLost || 0);
	const totalGold = sumBy(profiles, (profile) => profile.gold || 0);
	const totalShards = sumBy(profiles, (profile) => profile.relicShards || 0);
	const inventoryItems = sumBy(profiles, (profile) => inventoryQuantity(profile));
	const totalCompletedQuests = sumBy(profiles, (profile) => (profile.completedQuests || []).length);
	const activeQuests = profiles.filter((profile) => profile.activeQuest?.questId).length;
	const maxPossibleBossDefeats = Math.max(profiles.length * getBosses().length, 1);
	const bossDefeats = sumBy(profiles, (profile) => (profile.defeatedBosses || []).length);

	return {
		generatedAt: now,
		summary: {
			profiles: profiles.length,
			accessEnabled: accessRecords.filter((record) => record.enabled).length,
			accessRevoked: accessRecords.filter((record) => record.enabled === false).length,
			tutorialOffered: tutorialRecords.filter((record) => record.offered).length,
			tutorialCompleted: tutorialRecords.filter((record) => record.completed).length,
			tutorialSkipped: tutorialRecords.filter((record) => record.skipped).length,
			activeToday: profiles.filter((profile) => within(profile.updatedAt, now, 1)).length,
			active7d: profiles.filter((profile) => within(profile.updatedAt, now, 7)).length,
			active30d: profiles.filter((profile) => within(profile.updatedAt, now, 30)).length,
			new7d: profiles.filter((profile) => within(profile.createdAt, now, 7)).length,
			new30d: profiles.filter((profile) => within(profile.createdAt, now, 30)).length
		},
		progression: {
			averageRank: averageBy(profiles, (profile) => profile.level || 1),
			highestRank: Math.max(0, ...profiles.map((profile) => profile.level || 1)),
			questCompletionRate: ratio(totalCompletedQuests, Math.max(profiles.length * npcQuests.length, 1)),
			bossCompletionRate: ratio(bossDefeats, maxPossibleBossDefeats),
			activeQuests,
			questStepCounts: countBy(profiles, (profile) => String(profile.questStep || 0)),
			classCounts: countBy(profiles, (profile) => profile.classId || 'unknown'),
			originCounts: countBy(profiles, (profile) => profile.origin || 'unknown'),
			regionCounts: countBy(profiles, (profile) => profile.region || 'unknown'),
			bossDefeats: Object.fromEntries(
				getBosses().map((boss) => [boss.id, profiles.filter((profile) => (profile.defeatedBosses || []).includes(boss.id)).length])
			)
		},
		combat: {
			totalBattles,
			battlesWon,
			battlesLost,
			winRate: ratio(battlesWon, Math.max(totalBattles, 1)),
			averageBattles: averageBy(profiles, (profile) => (profile.battlesWon || 0) + (profile.battlesLost || 0)),
			noBattleProfiles: profiles.filter((profile) => !(profile.battlesWon || profile.battlesLost)).length
		},
		economy: {
			totalGold,
			averageGold: averageBy(profiles, (profile) => profile.gold || 0),
			totalShards,
			averageShards: averageBy(profiles, (profile) => profile.relicShards || 0),
			inventoryItems,
			averageInventoryItems: averageBy(profiles, inventoryQuantity),
			itemOwnership: Object.fromEntries(
				Object.keys(items).map((itemId) => [
					itemId,
					{
						owners: profiles.filter((profile) =>
							(profile.inventory || []).some((entry) => entry.itemId === itemId && (entry.quantity || 0) > 0)
						).length,
						quantity: sumBy(profiles, (profile) => itemQuantity(profile, itemId))
					}
				])
			),
			equipped: {
				weapon: countBy(profiles, (profile) => profile.equipment?.weapon || 'none'),
				armor: countBy(profiles, (profile) => profile.equipment?.armor || 'none'),
				charm: countBy(profiles, (profile) => profile.equipment?.charm || 'none')
			}
		},
		leaders: {
			rank: topProfiles(profiles, (profile) => profile.level || 1),
			gold: topProfiles(profiles, (profile) => profile.gold || 0),
			wins: topProfiles(profiles, (profile) => profile.battlesWon || 0),
			shards: topProfiles(profiles, (profile) => profile.relicShards || 0),
			recent: [...profiles]
				.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
				.slice(0, 5)
				.map(profileSnapshot)
		},
		content: {
			regions: Object.keys(regions).length,
			classes: Object.keys(classes).length,
			items: Object.keys(items).length,
			bosses: getBosses().length,
			mobs: Object.values(encounters)
				.flat()
				.filter((encounter) => !encounter.boss).length,
			npcQuests: npcQuests.length,
			questSteps: questSteps.length
		}
	};
}

async function travel(guildId, userId, regionId) {
	const profile = await requireProfile(guildId, userId);
	const region = regions[regionId];
	const gate = canTravel(profile, region);
	if (!gate.ok) throw new RpgError(gate.reason);

	profile.region = region.id;
	await saveProfile(profile);
	return { profile, region };
}

async function equip(guildId, userId, itemId) {
	const profile = await requireProfile(guildId, userId);
	const item = items[itemId];
	if (!item) throw new RpgError('That item does not exist.');
	if (item.slot === 'consumable') throw new RpgError('Consumables cannot be equipped yet.');

	const entry = (profile.inventory || []).find((inventoryItem) => inventoryItem.itemId === itemId && inventoryItem.quantity > 0);
	if (!entry) throw new RpgError('You do not own that item.');

	profile.equipment = { ...(profile.equipment || {}), [item.slot]: item.id };
	await saveProfile(profile);
	return { profile, item };
}

async function useItem(guildId, userId, itemId) {
	const profile = await requireProfile(guildId, userId);
	const item = items[itemId];
	if (!item) throw new RpgError('That item does not exist.');
	if (item.slot !== 'consumable') throw new RpgError('Only consumables can be used from inventory.');

	const entry = (profile.inventory || []).find((inventoryItem) => inventoryItem.itemId === itemId && inventoryItem.quantity > 0);
	if (!entry) throw new RpgError('You do not own that item.');

	const maxHp = getEffectiveMaxHp(profile);
	const hpBefore = profile.hp || 0;
	profile.hp = Math.min(maxHp, hpBefore + (item.stats?.hp || 0));
	const recoveredHp = Math.max(profile.hp - hpBefore, 0);
	decrementInventoryItem(profile, itemId);
	await saveProfile(profile);
	return { profile, item, recoveredHp };
}

async function acceptQuest(guildId, userId, questId) {
	const profile = await requireProfile(guildId, userId);
	const quest = getQuestById(questId);
	const gate = canStartQuest(profile, quest);
	if (!gate.ok) throw new RpgError(gate.reason);

	profile.activeQuest = {
		questId: quest.id,
		status: 'active',
		progress: createQuestProgress(quest),
		startedAt: Date.now()
	};
	await saveProfile(profile);
	return getQuestState(profile);
}

async function claimQuestReward(guildId, userId) {
	const profile = await requireProfile(guildId, userId);
	const state = getQuestState(profile);
	if (!state.activeQuest || state.activeQuest.status !== 'ready')
		throw new RpgError('Finish the active quest objective before returning for the reward.');

	const quest = state.quest;
	const rewards = quest.rewards || {};
	profile.gold = (profile.gold || 0) + (rewards.gold || 0);
	profile.relicShards = (profile.relicShards || 0) + (rewards.shards || 0);
	if (rewards.xp) addXp(profile, rewards.xp);
	for (const itemId of rewards.items || []) addInventoryItem(profile, itemId);

	if (!Array.isArray(profile.completedQuests)) profile.completedQuests = [];
	if (!profile.completedQuests.includes(quest.id)) profile.completedQuests.push(quest.id);
	profile.activeQuest = null;
	advanceQuest(profile);
	await saveProfile(profile);
	return { profile, quest, rewards };
}

async function startAdventure(guildId, userId) {
	const profile = await requireProfile(guildId, userId);
	const recoveredHp = restoreHp(profile);
	const regionEncounters = (encounters[profile.region] || encounters['broken-gate']).filter((encounter) => !encounter.boss);
	const encounter = rollEncounter(regionEncounters);
	await saveProfile(profile);
	await recordRpgEvent({ guildId, userId, event: 'first_adventure' });
	return { profile, encounter, region: regions[profile.region], recoveredHp };
}

function getEncounterById(encounterId) {
	const encounter = Object.values(encounters)
		.flat()
		.find((entry) => entry.id === encounterId);
	if (!encounter) throw new RpgError('That encounter does not exist.');
	return encounter;
}

function getBosses() {
	return Object.values(encounters)
		.flat()
		.filter((encounter) => encounter.boss);
}

function getBossById(bossId) {
	const boss = getBosses().find((encounter) => encounter.id === bossId);
	if (!boss) throw new RpgError('That boss does not exist.');
	return boss;
}

function canTravel(profile, region) {
	if (!region) return { ok: false, reason: 'That region does not exist.' };
	if ((profile.level || 1) < region.unlockRank) return { ok: false, reason: `${region.name} unlocks at Rank ${region.unlockRank}.` };
	if (region.requiredBoss && !hasDefeatedBoss(profile, region.requiredBoss)) {
		return {
			ok: false,
			bossRequired: true,
			bossId: region.requiredBoss,
			reason: `${region.name} is sealed until you defeat ${getEncounterById(region.requiredBoss).name}.`
		};
	}
	return { ok: true };
}

async function resolveAdventureTurn(guildId, userId, battle, stance) {
	const profile = await requireProfile(guildId, userId);
	const encounter = getEncounterById(battle.encounterId);
	if (encounter.boss && stance === 'flee') throw new RpgError(`${encounter.name} has sealed the room. You cannot flee this fight.`);

	const stats = getEffectiveStats(profile);
	const stanceBonus = getStanceBonus(stance, stats);
	const matchup = getEncounterMatchup(profile, encounter);
	const crit = randomInt(1, 100) <= Math.min(35, 5 + Math.floor(stats.luck / 8));
	const damageTuning = getDamageTuning(encounter);
	const stanceDamage = encounter.boss ? stanceBonus.damage : Math.min(stanceBonus.damage, 1.45);
	const damage = Math.max(
		Math.round(
			(stats.attack * stanceDamage * matchup.damage * damageTuning.scale +
				stats.focus * damageTuning.focus +
				stats.speed * damageTuning.speed +
				randomInt(damageTuning.randomMin, damageTuning.randomMax)) *
				(crit ? damageTuning.crit : 1)
		) - encounter.defense,
		1
	);
	const nextEnemyHp = Math.max((battle.enemyHp ?? encounter.hp) - damage, 0);
	const enemyDamage =
		nextEnemyHp > 0
			? Math.max(Math.round(((encounter.attack + randomInt(18, 76)) * matchup.incoming - stats.defense) / stanceBonus.guard), 0)
			: 0;
	const effectiveMaxHp = getEffectiveMaxHp(profile);
	const nextPlayerHp = Math.max(Math.min(battle.playerHp ?? profile.hp, effectiveMaxHp) - enemyDamage, 0);
	const won = nextEnemyHp <= 0;
	const lost = nextPlayerHp <= 0;

	profile.hp = lost ? 1 : Math.min(Math.max(nextPlayerHp, 1), effectiveMaxHp);

	const result = {
		profile,
		encounter,
		crit,
		damage,
		enemyDamage,
		enemyHp: nextEnemyHp,
		playerHp: profile.hp,
		won,
		lost,
		done: won || lost
	};

	if (won) {
		const gold = randomInt(encounter.gold[0], encounter.gold[1]);
		const loot = rollLoot(encounter, stats.luck + stanceBonus.loot);
		profile.gold += gold;
		profile.battlesWon += 1;
		if (encounter.boss) markBossDefeated(profile, encounter.id);
		if (loot) addInventoryItem(profile, loot);
		addXp(profile, encounter.xp);
		progressQuestKill(profile, encounter.id);
		advanceQuest(profile, loot);
		Object.assign(result, { gold, xp: encounter.xp, loot });
	} else if (lost) {
		profile.battlesLost += 1;
		Object.assign(result, { gold: 0, xp: 0, loot: null });
	}

	await saveProfile(profile);
	if (won) await recordRpgEvent({ guildId, userId, event: 'first_victory' });
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

	if (stance === 'flee') {
		const escaped = Math.random() * 100 < Math.min(85, 45 + Math.floor(stats.speed / 4));
		if (escaped) {
			await saveProfile(profile);
			return { profile, encounter, escaped: true };
		}
	}

	const playerRoll = stats.attack * 1.7 + stats.defense * 0.65 + stats.speed * 0.35 + stats.focus * 0.45 + stats.luck * 0.25 + randomInt(80, 180);
	const enemyRoll = encounter.hp * 0.18 + encounter.attack * 1.15 + encounter.defense * 0.85 + randomInt(60, 150);
	const crit = randomInt(1, 100) <= Math.min(35, 5 + Math.floor(stats.luck / 8));
	const damageTuning = getDamageTuning(encounter);
	const stanceDamage = encounter.boss ? stanceBonus.damage : Math.min(stanceBonus.damage, 1.45);
	const damage = Math.max(
		Math.round(
			(stats.attack * stanceDamage * matchup.damage * damageTuning.scale +
				stats.focus * damageTuning.focus +
				stats.speed * damageTuning.speed +
				randomInt(damageTuning.randomMin, damageTuning.randomMax)) *
				(crit ? damageTuning.crit : 1)
		) - encounter.defense,
		1
	);
	const enemyDamage = Math.max(Math.round(((encounter.attack + randomInt(18, 76)) * matchup.incoming - stats.defense) / stanceBonus.guard), 0);
	const won = playerRoll + damage >= enemyRoll;
	const effectiveMaxHp = getEffectiveMaxHp(profile);

	if (won) {
		const gold = randomInt(encounter.gold[0], encounter.gold[1]);
		const loot = rollLoot(encounter, stats.luck + stanceBonus.loot);
		profile.gold += gold;
		profile.battlesWon += 1;
		if (encounter.boss) markBossDefeated(profile, encounter.id);
		profile.hp = Math.min(effectiveMaxHp, Math.max(profile.hp - Math.floor(enemyDamage / 2), 1));
		if (loot) addInventoryItem(profile, loot);
		addXp(profile, encounter.xp);
		progressQuestKill(profile, encounter.id);
		advanceQuest(profile, loot);
		await saveProfile(profile);
		await recordRpgEvent({ guildId, userId, event: 'first_victory' });
		return { profile, encounter, won, crit, damage, enemyDamage: Math.floor(enemyDamage / 2), gold, xp: encounter.xp, loot };
	}

	profile.battlesLost += 1;
	profile.hp = Math.max(Math.min(profile.hp, effectiveMaxHp) - enemyDamage, 1);
	await saveProfile(profile);
	return { profile, encounter, won, crit, damage, enemyDamage, gold: 0, xp: 0, loot: null };
}

async function leaderboard(guildId, type = 'level') {
	assertDatabaseReady();
	const profiles = await RpgProfileSchema.find({});
	for (const profile of profiles) await normalizeProfile(profile);
	return profiles.sort((a, b) => compareProfiles(a, b, type));
}

async function saveProfile(profile) {
	assertDatabaseReady();
	if (!profile.userId) throw new RpgError('This RPG profile is missing database ownership fields.');
	profile.updatedAt = Date.now();
	await profile.save();
	return profile;
}

function getEffectiveStats(profile) {
	const stats = { ...(profile.stats || {}) };
	for (const itemId of Object.values(profile.equipment || {}).filter(Boolean)) {
		const item = items[itemId];
		for (const [stat, amount] of Object.entries(item?.stats || {})) {
			stats[stat] = (stats[stat] || 0) + amount;
		}
	}
	stats.hp = getEffectiveMaxHp(profile);
	return stats;
}

function getEffectiveMaxHp(profile) {
	let maxHp = Math.max(profile.maxHp || profile.stats?.hp || 1, 1);
	for (const itemId of Object.values(profile.equipment || {}).filter(Boolean)) {
		maxHp += items[itemId]?.stats?.hp || 0;
	}
	return maxHp;
}

function restoreHp(profile) {
	const maxHp = getEffectiveMaxHp(profile);
	const recoveredHp = Math.max(maxHp - (profile.hp || 0), 0);
	profile.hp = maxHp;
	return recoveredHp;
}

function addInventoryItem(profile, itemId) {
	const inventory = [...(profile.inventory || [])];
	const existing = inventory.find((entry) => entry.itemId === itemId);
	if (existing) existing.quantity += 1;
	else inventory.push({ itemId, quantity: 1 });
	profile.inventory = inventory;
}

function decrementInventoryItem(profile, itemId) {
	const inventory = [...(profile.inventory || [])];
	const existing = inventory.find((entry) => entry.itemId === itemId);
	if (!existing) return;
	existing.quantity -= 1;
	profile.inventory = inventory.filter((entry) => (entry.quantity || 0) > 0);
}

function addXp(profile, amount) {
	profile.xp += amount;
	while (profile.xp >= xpForRank(profile.level)) {
		profile.xp -= xpForRank(profile.level);
		profile.level += 1;
		applyRankGrowth(profile);
		profile.hp = getEffectiveMaxHp(profile);
	}
}

function advanceQuest(profile, loot) {
	if (profile.questStep === 0) profile.questStep = 1;
	if (profile.questStep === 1 && profile.battlesWon >= 3) profile.questStep = 2;
	if (profile.questStep === 2 && hasDefeatedBoss(profile, 'harlequin')) {
		profile.questStep = 2;
		profile.relicShards += 1;
	}
	if (profile.questStep === 2 && hasDefeatedBoss(profile, 'harlequin') && profile.level >= 5) profile.questStep = 3;
	if (profile.questStep === 3 && loot && items[loot]?.rarity === 'rare') profile.questStep = 4;
	if (profile.questStep === 4 && hasDefeatedBoss(profile, 'mossbound-regent')) profile.questStep = 5;
}

function getQuestById(questId) {
	const quest = npcQuests.find((entry) => entry.id === questId);
	if (!quest) throw new RpgError('That quest does not exist.');
	return quest;
}

function getQuestState(profile) {
	normalizeQuestFields(profile);
	let activeQuest = profile.activeQuest;
	let quest = activeQuest?.questId ? npcQuests.find((entry) => entry.id === activeQuest.questId) : null;

	if (activeQuest && !quest) {
		profile.activeQuest = null;
		activeQuest = null;
	}

	const availableQuest = activeQuest ? null : nextAvailableQuest(profile);
	return {
		profile,
		activeQuest,
		quest,
		availableQuest,
		completedQuests: profile.completedQuests || []
	};
}

function nextAvailableQuest(profile) {
	const completed = new Set(profile.completedQuests || []);
	return npcQuests.find((quest) => !completed.has(quest.id) && canStartQuest(profile, quest).ok) || null;
}

function canStartQuest(profile, quest) {
	if (!quest) return { ok: false, reason: 'That quest does not exist.' };
	if (profile.activeQuest?.questId) return { ok: false, reason: 'Finish or return your active quest before accepting another.' };
	if ((profile.completedQuests || []).includes(quest.id)) return { ok: false, reason: 'You already completed that quest.' };
	const region = regions[quest.regionId];
	const gate = canTravel(profile, region);
	if (!gate.ok) return { ok: false, reason: `This quest is in ${region?.name || 'another region'}. ${gate.reason}` };
	if (profile.region !== quest.regionId) return { ok: false, reason: `Travel to ${region.name} before accepting this quest.` };
	return { ok: true };
}

function createQuestProgress(quest) {
	return {
		mobKills: Object.fromEntries((quest.targets || []).map((target) => [target.encounterId, 0]))
	};
}

function progressQuestKill(profile, encounterId) {
	const state = getQuestState(profile);
	if (!state.quest || state.activeQuest?.status !== 'active') return false;
	const target = state.quest.targets?.find((entry) => entry.encounterId === encounterId);
	if (!target) return false;

	const progress = state.activeQuest.progress || createQuestProgress(state.quest);
	const mobKills = { ...(progress.mobKills || {}) };
	mobKills[encounterId] = Math.min((mobKills[encounterId] || 0) + 1, target.amount);
	state.activeQuest.progress = { ...progress, mobKills };
	if (isQuestObjectiveComplete(state.quest, state.activeQuest)) state.activeQuest.status = 'ready';
	profile.activeQuest = state.activeQuest;
	return true;
}

function isQuestObjectiveComplete(quest, activeQuest) {
	const mobKills = activeQuest?.progress?.mobKills || {};
	return (quest.targets || []).every((target) => (mobKills[target.encounterId] || 0) >= target.amount);
}

function normalizeQuestFields(profile) {
	if (!Array.isArray(profile.completedQuests)) profile.completedQuests = [];
	if (profile.activeQuest?.questId) {
		const quest = npcQuests.find((entry) => entry.id === profile.activeQuest.questId);
		if (!quest) {
			profile.activeQuest = null;
			return;
		}
		profile.activeQuest.status = profile.activeQuest.status || 'active';
		profile.activeQuest.progress = profile.activeQuest.progress || createQuestProgress(quest);
		for (const target of quest.targets || []) {
			if (typeof profile.activeQuest.progress.mobKills?.[target.encounterId] !== 'number') {
				profile.activeQuest.progress.mobKills = {
					...(profile.activeQuest.progress.mobKills || {}),
					[target.encounterId]: 0
				};
			}
		}
		if (profile.activeQuest.status === 'active' && isQuestObjectiveComplete(quest, profile.activeQuest)) profile.activeQuest.status = 'ready';
	}
}

function rollLoot(encounter, luck) {
	if (!encounter.loot?.length) return null;
	if (encounter.boss) return encounter.loot[randomInt(0, encounter.loot.length - 1)];
	const chance = Math.min(72, 20 + Math.floor(luck / 2));
	if (randomInt(1, 100) > chance) return null;
	return encounter.loot[randomInt(0, encounter.loot.length - 1)];
}

function rollEncounter(regionEncounters) {
	const weighted = regionEncounters.map((encounter) => ({ encounter, weight: encounter.weight ?? (encounter.boss ? 8 : 35) }));
	const totalWeight = weighted.reduce((total, entry) => total + entry.weight, 0);
	let roll = randomInt(1, totalWeight);

	for (const entry of weighted) {
		roll -= entry.weight;
		if (roll <= 0) return entry.encounter;
	}

	return regionEncounters.at(-1);
}

function getStanceBonus(stance, stats) {
	return (
		{
			attack: { damage: 1.15, guard: 0.85, loot: 0 },
			skill: { damage: 1 + stats.focus / 20, guard: 1, loot: 4 },
			defend: { damage: 0.75, guard: 1.45, loot: 1 },
			flee: { damage: 0, guard: 1, loot: 0 }
		}[stance] || { damage: 1, guard: 1, loot: 0 }
	);
}

function getDamageTuning(encounter) {
	if (encounter.boss) {
		return {
			scale: 2.2,
			focus: 0.35,
			speed: 0.18,
			randomMin: 60,
			randomMax: 150,
			crit: 1.7
		};
	}

	return {
		scale: 0.62,
		focus: 0.14,
		speed: 0.08,
		randomMin: 15,
		randomMax: 55,
		crit: 1.45
	};
}

function xpForRank(rank) {
	return xpPerLevel + Math.max((rank || 1) - 1, 0) * 35;
}

function xpToNextRank(profile) {
	return xpForRank(profile?.level || 1);
}

function adjustRank(profile, amount) {
	const target = Math.max((profile.level || 1) + amount, 1);
	while ((profile.level || 1) < target) {
		profile.level = (profile.level || 1) + 1;
		applyRankGrowth(profile);
	}
	if ((profile.level || 1) > target) profile.level = target;
	profile.hp = Math.min(profile.hp || getEffectiveMaxHp(profile), getEffectiveMaxHp(profile));
}

function applyRankGrowth(profile) {
	const archetype = classes[profile.classId];
	const growth = archetype?.growth || { hp: 140, attack: 10, defense: 8, speed: 5, luck: 4, focus: 5 };
	const stats = { ...(profile.stats || {}) };
	for (const [stat, amount] of Object.entries(growth)) {
		if (stat === 'hp') continue;
		stats[stat] = (stats[stat] || 0) + amount;
	}
	profile.stats = stats;
	profile.maxHp = Math.max((profile.maxHp || stats.hp || 1) + growth.hp, 1);
	profile.stats.hp = profile.maxHp;
}

function getGearTraits(profile) {
	return Object.values(profile.equipment || {})
		.filter(Boolean)
		.flatMap((itemId) => items[itemId]?.traits || []);
}

function getEncounterMatchup(profile, encounter) {
	const traits = getGearTraits(profile);
	const weaknessHits = traits.filter((trait) => encounter.weaknesses?.includes(trait)).length;
	const strengthHits = traits.filter((trait) => encounter.strengths?.includes(trait)).length;
	return {
		damage: Math.max(0.55, 1 + weaknessHits * 0.24 - strengthHits * 0.18),
		incoming: Math.max(0.72, 1 - weaknessHits * 0.08 + strengthHits * 0.1),
		traits,
		weaknessHits,
		strengthHits
	};
}

function hasDefeatedBoss(profile, bossId) {
	return (profile.defeatedBosses || []).includes(bossId);
}

function markBossDefeated(profile, bossId) {
	if (!profile.defeatedBosses) profile.defeatedBosses = [];
	if (!profile.defeatedBosses.includes(bossId)) profile.defeatedBosses.push(bossId);
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureCharacterId(profile) {
	if (profile.characterId) return profile;
	profile.characterId = await generateCharacterId();
	await saveProfile(profile);
	return profile;
}

async function normalizeProfile(profile) {
	let changed = false;
	if (!profile.characterId) {
		profile.characterId = await generateCharacterId();
		changed = true;
	}
	if (!Array.isArray(profile.defeatedBosses)) {
		profile.defeatedBosses = [];
		changed = true;
	}
	if (!Array.isArray(profile.completedQuests)) {
		profile.completedQuests = [];
		changed = true;
	}
	const beforeQuestState = JSON.stringify({ activeQuest: profile.activeQuest, completedQuests: profile.completedQuests });
	normalizeQuestFields(profile);
	if (JSON.stringify({ activeQuest: profile.activeQuest, completedQuests: profile.completedQuests }) !== beforeQuestState) changed = true;

	const archetype = classes[profile.classId];
	if (archetype && (!profile.maxHp || profile.maxHp < archetype.stats.hp)) {
		profile.maxHp = archetype.stats.hp;
		profile.stats = mergeMinimumStats(profile.stats, archetype.stats);
		profile.hp = Math.max(profile.hp || profile.maxHp, profile.maxHp);
		changed = true;
	} else if (archetype) {
		const mergedStats = mergeMinimumStats(profile.stats, archetype.stats);
		if (JSON.stringify(mergedStats) !== JSON.stringify(profile.stats || {})) {
			profile.stats = mergedStats;
			changed = true;
		}
	}

	const effectiveMaxHp = getEffectiveMaxHp(profile);
	if ((profile.hp || 0) > effectiveMaxHp) {
		profile.hp = effectiveMaxHp;
		changed = true;
	}

	if (changed) await saveProfile(profile);
	return profile;
}

function mergeMinimumStats(current = {}, minimum = {}) {
	const stats = { ...current };
	for (const [stat, amount] of Object.entries(minimum)) {
		stats[stat] = Math.max(stats[stat] || 0, amount);
	}
	return stats;
}

async function generateCharacterId() {
	let characterId;
	do {
		characterId = `RPG-${randomBytes(3).toString('hex').toUpperCase()}`;
	} while (await RpgProfileSchema.findOne({ characterId }));
	return characterId;
}

function normalizeCharacterId(characterId) {
	return String(characterId || '')
		.trim()
		.toUpperCase();
}

function validateDiscordUserId(userId) {
	if (!/^\d{17,20}$/.test(String(userId || ''))) throw new RpgError('Provide a valid Discord user ID.');
}

function within(timestamp, now, days) {
	return Number(timestamp || 0) >= now - days * 86_400_000;
}

function sumBy(entries, selector) {
	return entries.reduce((total, entry) => total + Number(selector(entry) || 0), 0);
}

function averageBy(entries, selector) {
	return entries.length ? sumBy(entries, selector) / entries.length : 0;
}

function ratio(value, total) {
	return total > 0 ? value / total : 0;
}

function countBy(entries, selector) {
	return entries.reduce((counts, entry) => {
		const key = selector(entry);
		counts[key] = (counts[key] || 0) + 1;
		return counts;
	}, {});
}

function inventoryQuantity(profile) {
	return (profile.inventory || []).reduce((total, entry) => total + (entry.quantity || 0), 0);
}

function itemQuantity(profile, itemId) {
	return (profile.inventory || []).find((entry) => entry.itemId === itemId)?.quantity || 0;
}

function topProfiles(profiles, selector) {
	return [...profiles]
		.sort((a, b) => selector(b) - selector(a))
		.slice(0, 5)
		.map((profile) => ({ ...profileSnapshot(profile), value: selector(profile) }));
}

function profileSnapshot(profile) {
	return {
		userId: profile.userId,
		characterId: profile.characterId,
		name: profile.name,
		level: profile.level || 1,
		region: profile.region,
		updatedAt: profile.updatedAt || profile.createdAt || 0
	};
}

function compareProfiles(a, b, type) {
	const sorters = {
		level: () => b.level - a.level || b.xp - a.xp || b.battlesWon - a.battlesWon,
		gold: () => b.gold - a.gold || b.level - a.level || b.xp - a.xp,
		wins: () => b.battlesWon - a.battlesWon || b.level - a.level || b.xp - a.xp,
		shards: () => b.relicShards - a.relicShards || b.level - a.level || b.xp - a.xp
	};
	return (sorters[type] || sorters.level)();
}

class RpgError extends Error {}

function assertDatabaseReady() {
	if (isMysqlConnected()) return;
	const message = getMysqlError()?.message || 'DATABASE_URL or MYSQL_URL is not set';
	throw new RpgError(
		`The RPG database is not connected, so your RPG data cannot be saved right now. Ask a developer to check the database connection. (${message})`
	);
}

module.exports = {
	RpgError,
	acceptQuest,
	adminAddCurrency,
	adminAnalytics,
	adminAddItem,
	adminMaxCharacter,
	adminWipeCharacter,
	createProfile,
	deleteProfile,
	equip,
	canTravel,
	getBossById,
	getBosses,
	getEffectiveStats,
	getEffectiveMaxHp,
	getEncounterById,
	getEncounterMatchup,
	getProfile,
	getProfileByCharacterId,
	getQuestState,
	getRpgAccess,
	grantRpgAccess,
	hasRpgAccess,
	items,
	leaderboard,
	markTutorialCompleted,
	markTutorialOffered,
	markTutorialStarted,
	markTutorialSkipped,
	questSteps,
	regions,
	requireProfile,
	revokeRpgAccess,
	claimQuestReward,
	resolveAdventure,
	resolveAdventureTurn,
	shouldOfferTutorial,
	prepareBossFight,
	startAdventure,
	travel,
	useItem,
	xpForRank,
	xpToNextRank,
	xpPerLevel
};
