const repositories = require('../repositories');
const {
	RpgError,
	addInventoryItem,
	addXp,
	adjustRank,
	assertDatabaseReady,
	classes,
	encounters,
	getBosses,
	getEffectiveMaxHp,
	items,
	npcQuests,
	questSteps,
	regions,
	saveProfile,
	xpForRank
} = require('./core');
const { getProfileByCharacterId } = require('./profileService');

const adminMaxRank = 100;
const adminMaxGold = 999_999_999;
const adminMaxShards = 999_999;
const adminMaxItemQuantity = 99;

async function adminAddCurrency(characterId, currency, amount) {
	const profile = await getProfileByCharacterId(characterId);
	const value = Number(amount);
	if (!Number.isInteger(value) || value === 0) throw new RpgError('Amount must be a non-zero whole number.');
	if (currency === 'gold') profile.gold = Math.max((profile.gold || 0) + value, 0);
	else if (currency === 'shards') profile.relicShards = Math.max((profile.relicShards || 0) + value, 0);
	else if (currency === 'xp') {
		if (value > 0) addXp(profile, value);
		else profile.xp = Math.max((profile.xp || 0) + value, 0);
	} else if (currency === 'level' || currency === 'rank') adjustRank(profile, value);
	else throw new RpgError('Currency must be one of: gold, shards, xp, rank.');
	await saveProfile(profile);
	return profile;
}

async function adminAddItem(characterId, itemId, quantity = 1) {
	const profile = await getProfileByCharacterId(characterId);
	const item = items[itemId];
	if (!item) throw new RpgError('That item does not exist.');
	const amount = Number(quantity);
	if (!Number.isInteger(amount) || amount < 1) throw new RpgError('Quantity must be at least 1.');
	for (let index = 0; index < amount; index += 1) addInventoryItem(profile, itemId);
	await saveProfile(profile);
	return { profile, item, quantity: amount };
}

async function adminWipeCharacter(characterId) {
	const profile = await getProfileByCharacterId(characterId);
	const result = await repositories.profiles.deleteOne({ characterId: profile.characterId });
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
	return { profile, itemCount: Object.keys(items).length, itemQuantity: adminMaxItemQuantity, rank: adminMaxRank };
}

async function adminAnalytics() {
	assertDatabaseReady();
	const [profiles, accessRecords, tutorialRecords, playerGrowthRecords, serverBossRecords] = await Promise.all([
		repositories.profiles.find({}),
		repositories.access.find({}),
		repositories.tutorials.find({}),
		repositories.players.find({}),
		repositories.bosses.find({})
	]);
	const now = Date.now();
	const totalBattles = sumBy(profiles, (profile) => (profile.battlesWon || 0) + (profile.battlesLost || 0));
	const battlesWon = sumBy(profiles, (profile) => profile.battlesWon || 0);
	const battlesLost = sumBy(profiles, (profile) => profile.battlesLost || 0);
	const totalGold = sumBy(profiles, (profile) => profile.gold || 0);
	const totalShards = sumBy(profiles, (profile) => profile.relicShards || 0);
	const inventoryItems = sumBy(profiles, inventoryQuantity);
	const totalCompletedQuests = sumBy(profiles, (profile) => (profile.completedQuests || []).length);
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
			bossCompletionRate: ratio(bossDefeats, Math.max(profiles.length * getBosses().length, 1)),
			activeQuests: profiles.filter((profile) => profile.activeQuest?.questId).length,
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
				.sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
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
		},
		growth: {
			shares: sumBy(playerGrowthRecords, (record) => record.shareCount || 0),
			referrals: sumBy(playerGrowthRecords, (record) => record.referrals || 0),
			badgesOwned: sumBy(playerGrowthRecords, (record) => (record.badges || record.cosmetics || []).length),
			achievementUnlocks: sumBy(playerGrowthRecords, (record) => (record.achievements || []).length),
			seasonClaims: sumBy(playerGrowthRecords, (record) => (record.seasonClaims || []).length),
			activeServerBosses: serverBossRecords.filter((record) => record.status === 'active').length,
			defeatedServerBosses: serverBossRecords.filter((record) => record.status === 'defeated').length,
			bossContributors: new Set(serverBossRecords.flatMap((record) => Object.keys(record.contributions || {}))).size
		}
	};
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
		.sort((left, right) => selector(right) - selector(left))
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

module.exports = { adminAddCurrency, adminAddItem, adminAnalytics, adminMaxCharacter, adminWipeCharacter };
