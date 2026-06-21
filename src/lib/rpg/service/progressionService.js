const {
	RpgError,
	RpgProfileSchema,
	addInventoryItem,
	addXp,
	advanceQuest,
	assertDatabaseReady,
	canStartQuest,
	canTravel,
	compareProfiles,
	createQuestProgress,
	decrementInventoryItem,
	getEffectiveMaxHp,
	getQuestById,
	getQuestState,
	items,
	normalizeProfile,
	regions,
	requireProfile,
	saveProfile
} = require('./core');

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
	if (hpBefore >= maxHp) throw new RpgError('Your HP is already full. Save that consumable for when you are injured.');
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
	if (!state.activeQuest || state.activeQuest.status !== 'ready') {
		throw new RpgError('Finish the active quest objective before returning for the reward.');
	}
	const quest = state.quest;
	const rewards = quest.rewards || {};
	profile.gold = (profile.gold || 0) + (rewards.gold || 0);
	profile.relicShards = (profile.relicShards || 0) + (rewards.shards || 0);
	if (rewards.xp) addXp(profile, rewards.xp);
	for (const itemId of rewards.items || []) addInventoryItem(profile, itemId);
	profile.completedQuests ||= [];
	if (!profile.completedQuests.includes(quest.id)) profile.completedQuests.push(quest.id);
	profile.activeQuest = null;
	advanceQuest(profile);
	await saveProfile(profile);
	return { profile, quest, rewards };
}

async function leaderboard(guildId, type = 'level') {
	assertDatabaseReady();
	const profiles = await RpgProfileSchema.find({});
	for (const profile of profiles) await normalizeProfile(profile);
	return profiles.filter((profile) => profile.guildId === guildId).sort((a, b) => compareProfiles(a, b, type));
}

module.exports = { acceptQuest, claimQuestReward, equip, leaderboard, travel, useItem };
