const { randomBytes } = require('node:crypto');
const { classes, encounters, items, npcQuests, questSteps, regions } = require('../data');
const repositories = require('../repositories');
const { commandMention } = require('../../util/commandMentions');

const xpPerLevel = 100;

class RpgError extends Error {}

function assertDatabaseReady() {
	if (repositories.database.isConnected()) return;
	const message = repositories.database.error()?.message || 'DATABASE_URL or MYSQL_URL is not set';
	throw new RpgError(
		`The RPG database is not connected, so your RPG data cannot be saved right now. Ask a developer to check the database connection. (${message})`
	);
}

async function getProfile(guildId, userId) {
	assertDatabaseReady();
	const profile = await repositories.profiles.findOne({ userId });
	return profile ? normalizeProfile(profile) : null;
}

async function requireProfile(guildId, userId) {
	const profile = await getProfile(guildId, userId);
	if (!profile) throw new RpgError(`Create a character first with ${commandMention('rpg create')}.`);
	return profile;
}

async function saveProfile(profile) {
	assertDatabaseReady();
	if (!profile.userId) throw new RpgError('This RPG profile is missing database ownership fields.');
	profile.updatedAt = Date.now();
	await profile.save();
	return profile;
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

function getEffectiveStats(profile) {
	const stats = { ...(profile.stats || {}) };
	for (const itemId of Object.values(profile.equipment || {}).filter(Boolean)) {
		const item = items[itemId];
		for (const [stat, amount] of Object.entries(item?.stats || {})) stats[stat] = (stats[stat] || 0) + amount;
	}
	stats.hp = getEffectiveMaxHp(profile);
	return stats;
}

function getEffectiveMaxHp(profile) {
	let maxHp = Math.max(profile.maxHp || profile.stats?.hp || 1, 1);
	for (const itemId of Object.values(profile.equipment || {}).filter(Boolean)) maxHp += items[itemId]?.stats?.hp || 0;
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

function getQuestState(profile, options = {}) {
	normalizeQuestFields(profile);
	let activeQuest = profile.activeQuest;
	let quest = activeQuest?.questId ? npcQuests.find((entry) => entry.id === activeQuest.questId) : null;
	if (activeQuest && !quest) {
		profile.activeQuest = null;
		activeQuest = null;
	}
	return {
		profile,
		activeQuest,
		quest,
		availableQuest: activeQuest ? null : nextAvailableQuest(profile, options.regionId),
		completedQuests: profile.completedQuests || []
	};
}

function nextAvailableQuest(profile, preferredRegionId = null) {
	const completed = new Set(profile.completedQuests || []);
	const candidates = npcQuests.filter((quest) => !completed.has(quest.id) && canStartQuest(profile, quest).ok);
	return (
		(preferredRegionId ? candidates.find((quest) => quest.regionId === preferredRegionId) : null) ||
		candidates.find((quest) => quest.regionId === profile.region) ||
		candidates[0] ||
		null
	);
}

function availableQuestRegions(profile) {
	const completed = new Set(profile.completedQuests || []);
	return Object.values(regions)
		.sort((left, right) => left.chapter - right.chapter)
		.map((region) => ({
			region,
			quest: npcQuests.find((quest) => quest.regionId === region.id && !completed.has(quest.id) && canStartQuest(profile, quest).ok) || null
		}))
		.filter((entry) => entry.quest);
}

function canStartQuest(profile, quest) {
	if (!quest) return { ok: false, reason: 'That quest does not exist.' };
	if (profile.activeQuest?.questId) return { ok: false, reason: 'Finish or return your active quest before accepting another.' };
	if ((profile.completedQuests || []).includes(quest.id)) return { ok: false, reason: 'You already completed that quest.' };
	const region = regions[quest.regionId];
	const gate = canTravel(profile, region);
	if (!gate.ok) return { ok: false, reason: `This quest is in ${region?.name || 'another region'}. ${gate.reason}` };
	return { ok: true };
}

function createQuestProgress(quest) {
	return { mobKills: Object.fromEntries((quest.targets || []).map((target) => [target.encounterId, 0])) };
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
	if (!profile.activeQuest?.questId) return;
	const quest = npcQuests.find((entry) => entry.id === profile.activeQuest.questId);
	if (!quest) {
		profile.activeQuest = null;
		return;
	}
	profile.activeQuest.status ||= 'active';
	profile.activeQuest.progress ||= createQuestProgress(quest);
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

function rollLoot(encounter, luck) {
	if (!encounter.loot?.length) return null;
	if (encounter.boss) return encounter.loot[randomInt(0, encounter.loot.length - 1)];
	if (randomInt(1, 100) > Math.min(72, 20 + Math.floor(luck / 2))) return null;
	return encounter.loot[randomInt(0, encounter.loot.length - 1)];
}

function rollEncounter(regionEncounters) {
	const weighted = regionEncounters.map((encounter) => ({ encounter, weight: encounter.weight ?? (encounter.boss ? 8 : 35) }));
	let roll = randomInt(
		1,
		weighted.reduce((total, entry) => total + entry.weight, 0)
	);
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
	return encounter.boss
		? { scale: 2.2, focus: 0.35, speed: 0.18, randomMin: 60, randomMax: 150, crit: 1.7 }
		: { scale: 0.62, focus: 0.14, speed: 0.08, randomMin: 15, randomMax: 55, crit: 1.45 };
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
		if (stat !== 'hp') stats[stat] = (stats[stat] || 0) + amount;
	}
	profile.stats = stats;
	profile.maxHp = Math.max((profile.maxHp || stats.hp || 1) + growth.hp, 1);
	profile.stats.hp = profile.maxHp;
}

function getEncounterMatchup(profile, encounter) {
	const traits = Object.values(profile.equipment || {})
		.filter(Boolean)
		.flatMap((itemId) => items[itemId]?.traits || []);
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
	profile.defeatedBosses ||= [];
	if (!profile.defeatedBosses.includes(bossId)) profile.defeatedBosses.push(bossId);
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
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
	for (const [stat, amount] of Object.entries(minimum)) stats[stat] = Math.max(stats[stat] || 0, amount);
	return stats;
}

async function generateCharacterId() {
	let characterId;
	do {
		characterId = `RPG-${randomBytes(3).toString('hex').toUpperCase()}`;
	} while (await repositories.profiles.findOne({ characterId }));
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

function compareProfiles(a, b, type) {
	const sorters = {
		level: () => b.level - a.level || b.xp - a.xp || b.battlesWon - a.battlesWon,
		gold: () => b.gold - a.gold || b.level - a.level || b.xp - a.xp,
		wins: () => b.battlesWon - a.battlesWon || b.level - a.level || b.xp - a.xp,
		shards: () => b.relicShards - a.relicShards || b.level - a.level || b.xp - a.xp
	};
	return (sorters[type] || sorters.level)();
}

module.exports = {
	RpgError,
	addInventoryItem,
	addXp,
	adjustRank,
	advanceQuest,
	assertDatabaseReady,
	availableQuestRegions,
	canStartQuest,
	canTravel,
	classes,
	compareProfiles,
	createQuestProgress,
	decrementInventoryItem,
	encounters,
	generateCharacterId,
	getBossById,
	getBosses,
	getDamageTuning,
	getEffectiveMaxHp,
	getEffectiveStats,
	getEncounterById,
	getEncounterMatchup,
	getProfile,
	getQuestById,
	getQuestState,
	items,
	markBossDefeated,
	normalizeCharacterId,
	normalizeProfile,
	npcQuests,
	progressQuestKill,
	questSteps,
	randomInt,
	regions,
	requireProfile,
	restoreHp,
	rollEncounter,
	rollLoot,
	saveProfile,
	validateDiscordUserId,
	xpForRank,
	xpPerLevel,
	xpToNextRank,
	getStanceBonus
};
