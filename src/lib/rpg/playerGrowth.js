const { randomBytes } = require('node:crypto');
const repositories = require('./repositories');
const { achievements, badges, items } = require('./data');

const BOSS_ATTACK_COOLDOWN = 30 * 60_000;
const rewards = {
	seasonal: { item: items.stormglass_aura, badge: badges['stormglass-pathfinder'] },
	referral: { item: items.gatebound_crest, badge: badges['gatebound-guide'] },
	raid: { item: items.worldbreaker_sigil, badge: badges.worldbreaker }
};
function currentSeason(now = new Date()) {
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	let name;
	let seasonYear = year;
	let startsAt;
	let endsAt;

	if (month < 2) {
		name = 'Winter';
		startsAt = Date.UTC(year - 1, 11, 1);
		endsAt = Date.UTC(year, 2, 1);
	} else if (month < 5) {
		name = 'Spring';
		startsAt = Date.UTC(year, 2, 1);
		endsAt = Date.UTC(year, 5, 1);
	} else if (month < 8) {
		name = 'Summer';
		startsAt = Date.UTC(year, 5, 1);
		endsAt = Date.UTC(year, 8, 1);
	} else if (month < 11) {
		name = 'Autumn';
		startsAt = Date.UTC(year, 8, 1);
		endsAt = Date.UTC(year, 11, 1);
	} else {
		name = 'Winter';
		seasonYear = year + 1;
		startsAt = Date.UTC(year, 11, 1);
		endsAt = Date.UTC(year + 1, 2, 1);
	}

	const id = `${seasonYear}-${name.toLowerCase()}`;
	const legacyQuarter = `${year}-q${Math.floor(month / 3) + 1}`;
	return {
		id,
		name,
		startsAt,
		endsAt,
		legacyIds: [legacyQuarter],
		quest: { victories: 5, consecutiveDays: 3 },
		item: rewards.seasonal.item,
		badge: rewards.seasonal.badge
	};
}

async function globalLeaderboard(type = 'level', limit = 100) {
	const profiles = await repositories.profiles.find({});
	return profiles.sort((a, b) => compareProfiles(a, b, type)).slice(0, limit);
}

async function getPlayerGrowth(userId) {
	const existing = await repositories.players.findOne({ userId });
	if (existing) {
		hydrate(existing);
		if (!(existing.cosmetics || []).length) return existing;
	}

	return withLockedAggregates([playerLock(userId)], async () => {
		const [growth, profile] = await Promise.all([loadPlayerGrowth(userId, true), repositories.profiles.findOneForUpdate({ userId })]);
		if (profile && migrateLegacyRewards(growth, profile)) await Promise.all([growth.save(), profile.save()]);
		return growth;
	});
}

async function loadPlayerGrowth(userId, forUpdate = false) {
	let record = forUpdate ? await repositories.players.findOneForUpdate({ userId }) : await repositories.players.findOne({ userId });
	if (!record) record = repositories.players.createRecord({ userId, referralCode: createReferralCode() });
	hydrate(record);
	await record.save();
	return record;
}

async function syncAchievements(profile) {
	return withLockedAggregates([playerLock(profile.userId)], async () => {
		const [growth, lockedProfile] = await Promise.all([
			loadPlayerGrowth(profile.userId, true),
			repositories.profiles.findOneForUpdate({ userId: profile.userId })
		]);
		const rewardProfile = lockedProfile || profile;
		const unlocked = achievements.filter((achievement) => achievement.test(rewardProfile));
		const newlyUnlocked = [];
		const rewardsEarned = { gold: 0, shards: 0, badges: [] };
		for (const achievement of unlocked) {
			if (!growth.achievements.includes(achievement.id)) {
				growth.achievements.push(achievement.id);
				newlyUnlocked.push(achievement);
				const gold = achievement.rewards?.gold || 0;
				const shards = achievement.rewards?.shards || 0;
				rewardProfile.gold = (rewardProfile.gold || 0) + gold;
				rewardProfile.relicShards = (rewardProfile.relicShards || 0) + shards;
				rewardsEarned.gold += gold;
				rewardsEarned.shards += shards;
				if (achievement.badgeId) {
					addBadge(growth, achievement.badgeId);
					rewardsEarned.badges.push(badges[achievement.badgeId]);
				}
			}
		}
		growth.updatedAt = Date.now();
		rewardProfile.updatedAt = Date.now();
		await Promise.all([growth.save(), rewardProfile.save()]);
		if (rewardProfile !== profile) {
			profile.gold = rewardProfile.gold;
			profile.relicShards = rewardProfile.relicShards;
		}
		return { growth, unlocked, newlyUnlocked, profile: rewardProfile, rewards: rewardsEarned };
	});
}

async function recordSeasonVictory(userId, now = new Date()) {
	return withLockedAggregates([playerLock(userId)], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		const season = currentSeason(now);
		growth.seasonVictories[season.id] = (growth.seasonVictories[season.id] || 0) + 1;
		growth.updatedAt = Date.now();
		await growth.save();
		return growth.seasonVictories[season.id];
	});
}

async function recordSeasonActivity(userId, now = new Date()) {
	return withLockedAggregates([playerLock(userId)], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		const season = currentSeason(now);
		const day = now.toISOString().slice(0, 10);
		growth.seasonActiveDays[season.id] ||= {};
		growth.seasonActiveDays[season.id][day] = true;
		growth.updatedAt = Date.now();
		await growth.save();
		return consecutiveDayStreak(Object.keys(growth.seasonActiveDays[season.id]), season);
	});
}

async function redeemReferral(userId, code) {
	const referralCode = String(code).trim().toUpperCase();
	return withLockedAggregates([playerLock(userId), `rpg:referral:${referralCode}`], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		if (growth.referredBy) throw new Error('You already redeemed a referral code.');
		const referrer = await repositories.players.findOneForUpdate({ referralCode });
		if (!referrer) throw new Error('That referral code does not exist.');
		if (referrer.userId === userId) throw new Error('You cannot redeem your own referral code.');
		const [profile, referrerProfile] = await Promise.all([
			repositories.profiles.findOneForUpdate({ userId }),
			repositories.profiles.findOneForUpdate({ userId: referrer.userId })
		]);
		if (!profile) throw new Error('Create your Warden before redeeming a referral code.');
		if (!referrerProfile) throw new Error('The referring Warden no longer has an RPG profile.');

		growth.referredBy = referrer.userId;
		addBadge(growth, rewards.referral.badge.id);
		addInventoryItem(profile, rewards.referral.item.id);
		referrer.referrals = (referrer.referrals || 0) + 1;
		addBadge(referrer, rewards.referral.badge.id);
		addInventoryItem(referrerProfile, rewards.referral.item.id);
		growth.updatedAt = referrer.updatedAt = Date.now();
		await Promise.all([growth.save(), profile.save(), referrer.save(), referrerProfile.save()]);
		return { growth, profile, referrer, referrerProfile, item: rewards.referral.item, badge: rewards.referral.badge };
	});
}

async function seasonalProgress(userId, lockedGrowth = null) {
	const season = currentSeason();
	const [profile, activityRecords, growth] = await Promise.all([
		repositories.profiles.findOne({ userId }),
		repositories.activity.find({ userId }),
		lockedGrowth || getPlayerGrowth(userId)
	]);
	if (!profile) throw new Error('Create your Warden to participate in the season.');
	const migrated = migrateSeasonActivity(growth, activityRecords, season);
	if (migrated) await growth.save();
	const activeDays = Object.keys(growth.seasonActiveDays[season.id] || {});
	const consecutiveDays = consecutiveDayStreak(activeDays, season);
	const victoryIds = [season.id, ...season.legacyIds];
	const victories = victoryIds.reduce((total, id) => total + (growth.seasonVictories[id] || 0), 0);
	const progress = {
		victories: Math.min(victories, season.quest.victories),
		consecutiveDays: Math.min(consecutiveDays, season.quest.consecutiveDays)
	};
	return {
		season,
		progress,
		complete: progress.victories >= season.quest.victories && progress.consecutiveDays >= season.quest.consecutiveDays,
		claimed: [season.id, ...season.legacyIds].some((id) => growth.seasonClaims.includes(id)),
		growth
	};
}

async function claimSeason(userId) {
	return withLockedAggregates([playerLock(userId)], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		const status = await seasonalProgress(userId, growth);
		if (!status.complete) throw new Error('Complete the seasonal quest before claiming its limited item and badge.');
		if (status.claimed) throw new Error('You already claimed this season reward.');
		const profile = await repositories.profiles.findOneForUpdate({ userId });
		if (!profile) throw new Error('Create your Warden to claim the seasonal reward.');
		status.growth.seasonClaims.push(status.season.id);
		addBadge(status.growth, status.season.badge.id);
		addInventoryItem(profile, status.season.item.id);
		status.growth.updatedAt = Date.now();
		await Promise.all([status.growth.save(), profile.save()]);
		return { ...status, profile, item: status.season.item, badge: status.season.badge };
	});
}

async function getServerBoss(guildId, now = Date.now()) {
	const season = currentSeason(new Date(now));
	return withLockedAggregates([bossLock(guildId, season.id)], () => loadServerBoss(guildId, season, now, true));
}

async function loadServerBoss(guildId, season, now, forUpdate = false) {
	let boss = forUpdate
		? await repositories.bosses.findOneForUpdate({ guildId, seasonId: season.id })
		: await repositories.bosses.findOne({ guildId, seasonId: season.id });
	if (!boss) {
		boss = await repositories.bosses.create({
			guildId,
			seasonId: season.id,
			name: `${season.name} Colossus`,
			maxHp: 250_000,
			hp: 250_000,
			contributions: {},
			lastAttacks: {},
			startedAt: now
		});
	}
	hydrateBoss(boss);
	return boss;
}

async function attackServerBoss(guildId, userId, now = Date.now()) {
	const season = currentSeason(new Date(now));
	return withLockedAggregates([bossLock(guildId, season.id)], async () => {
		const [profile, boss] = await Promise.all([repositories.profiles.findOne({ userId }), loadServerBoss(guildId, season, now, true)]);
		if (!profile) throw new Error('Create your Warden before joining the server boss event.');
		if (boss.status === 'defeated') throw new Error('Your server already defeated this seasonal boss.');
		const lastAttack = Number(boss.lastAttacks[userId] || 0);
		if (now - lastAttack < BOSS_ATTACK_COOLDOWN) {
			throw new Error(`You can attack again <t:${Math.ceil((lastAttack + BOSS_ATTACK_COOLDOWN) / 1000)}:R>.`);
		}
		const damage = Math.max(100, Math.round((profile.level || 1) * 120 + (profile.stats?.attack || 5) * 18 + (profile.battlesWon || 0) * 4));
		boss.hp = Math.max(boss.hp - damage, 0);
		boss.lastAttacks[userId] = now;
		boss.contributions[userId] = (boss.contributions[userId] || 0) + damage;
		boss.updatedAt = now;
		let defeated = false;
		if (boss.hp === 0) {
			boss.status = 'defeated';
			boss.defeatedAt = now;
			defeated = true;
			await rewardBossContributors(boss);
		}
		await boss.save();
		return { boss, damage, defeated, contribution: boss.contributions[userId] };
	});
}

async function rewardBossContributors(boss) {
	for (const userId of Object.keys(boss.contributions).sort()) {
		await repositories.database.acquireLock(playerLock(userId));
		const [growth, profile] = await Promise.all([loadPlayerGrowth(userId, true), repositories.profiles.findOneForUpdate({ userId })]);
		if (!profile) continue;
		addBadge(growth, rewards.raid.badge.id);
		addInventoryItem(profile, rewards.raid.item.id);
		growth.updatedAt = Date.now();
		await Promise.all([growth.save(), profile.save()]);
	}
}

async function withLockedAggregates(lockNames, operation) {
	return repositories.database.transaction(async () => {
		for (const lockName of [...new Set(lockNames)].sort()) await repositories.database.acquireLock(lockName);
		return operation();
	});
}

function playerLock(userId) {
	return `rpg:player:${userId}`;
}

function bossLock(guildId, seasonId) {
	return `rpg:boss:${guildId}:${seasonId}`;
}

function achievementById(id) {
	return achievements.find((entry) => entry.id === id) || null;
}

async function setFeaturedBadge(userId, badgeId) {
	return withLockedAggregates([playerLock(userId)], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		if (!badges[badgeId]) throw new Error('That badge does not exist.');
		if (!growth.badges.includes(badgeId)) throw new Error('You have not unlocked that badge.');
		growth.featuredBadge = badgeId;
		growth.updatedAt = Date.now();
		await growth.save();
		return { growth, badge: badges[badgeId] };
	});
}

function addBadge(growth, badgeId, { feature = true } = {}) {
	if (!growth.badges.includes(badgeId)) growth.badges.push(badgeId);
	if (feature || !growth.featuredBadge) growth.featuredBadge = badgeId;
}

function addInventoryItem(profile, itemId) {
	profile.inventory ||= [];
	const existing = profile.inventory.find((entry) => entry.itemId === itemId);
	if (existing) existing.quantity = Math.max(existing.quantity || 0, 1);
	else profile.inventory.push({ itemId, quantity: 1 });
	profile.updatedAt = Date.now();
}

function migrateLegacyRewards(growth, profile) {
	let changed = false;
	const migrations = [
		{ matches: (id) => id.startsWith('stormglass-aura'), reward: rewards.seasonal },
		{ matches: (id) => id === 'gatebound-crest', reward: rewards.referral },
		{ matches: (id) => id === 'worldbreaker-sigil', reward: rewards.raid }
	];
	for (const legacyId of growth.cosmetics || []) {
		const migration = migrations.find((entry) => entry.matches(legacyId));
		if (!migration) continue;
		const badgeCount = growth.badges.length;
		const featuredBadge = growth.featuredBadge;
		addBadge(growth, migration.reward.badge.id, { feature: false });
		const itemCount = profile.inventory?.length || 0;
		addInventoryItem(profile, migration.reward.item.id);
		if (growth.badges.length !== badgeCount || growth.featuredBadge !== featuredBadge || (profile.inventory?.length || 0) !== itemCount) {
			changed = true;
		}
	}
	return changed;
}

function hydrate(record) {
	record.cosmetics ||= [];
	record.badges ||= [];
	record.featuredBadge ||= null;
	record.achievements ||= [];
	record.seasonClaims ||= [];
	record.seasonVictories ||= {};
	record.seasonActiveDays ||= {};
	record.referrals ||= 0;
	record.shareCount ||= 0;
	for (const achievementId of record.achievements) {
		const achievement = achievementById(achievementId);
		if (achievement?.badgeId) addBadge(record, achievement.badgeId, { feature: false });
	}
	for (const legacyId of record.cosmetics) {
		if (legacyId.startsWith('stormglass-aura')) addBadge(record, rewards.seasonal.badge.id, { feature: false });
		if (legacyId === 'gatebound-crest') addBadge(record, rewards.referral.badge.id, { feature: false });
		if (legacyId === 'worldbreaker-sigil') addBadge(record, rewards.raid.badge.id, { feature: false });
	}
}

function migrateSeasonActivity(growth, activityRecords, season) {
	growth.seasonActiveDays[season.id] ||= {};
	let changed = false;
	for (const activity of activityRecords || []) {
		for (const day of Object.keys(activity.activeDays || {})) {
			if (!isDayInSeason(day, season) || growth.seasonActiveDays[season.id][day]) continue;
			growth.seasonActiveDays[season.id][day] = true;
			changed = true;
		}
	}
	return changed;
}

function consecutiveDayStreak(days, season) {
	const timestamps = [...new Set(days)]
		.filter((day) => isDayInSeason(day, season))
		.map((day) => Date.parse(`${day}T00:00:00.000Z`))
		.sort((left, right) => left - right);
	let longest = 0;
	let current = 0;
	let previous = null;
	for (const timestamp of timestamps) {
		current = previous !== null && timestamp - previous === 86_400_000 ? current + 1 : 1;
		longest = Math.max(longest, current);
		previous = timestamp;
	}
	return longest;
}

function isDayInSeason(day, season) {
	const timestamp = Date.parse(`${day}T00:00:00.000Z`);
	return timestamp >= season.startsAt && timestamp < season.endsAt;
}

function hydrateBoss(boss) {
	boss.contributions ||= {};
	boss.lastAttacks ||= {};
}

function createReferralCode() {
	return `CADIA-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function compareProfiles(a, b, type) {
	const values = {
		level: (profile) => profile.level || 1,
		gold: (profile) => profile.gold || 0,
		wins: (profile) => profile.battlesWon || 0,
		shards: (profile) => profile.relicShards || 0
	};
	const selector = values[type] || values.level;
	return selector(b) - selector(a) || (b.level || 1) - (a.level || 1);
}

module.exports = {
	BOSS_ATTACK_COOLDOWN,
	achievementById,
	achievements,
	attackServerBoss,
	badges,
	claimSeason,
	currentSeason,
	getPlayerGrowth,
	getServerBoss,
	globalLeaderboard,
	recordSeasonVictory,
	recordSeasonActivity,
	redeemReferral,
	rewards,
	seasonalProgress,
	setFeaturedBadge,
	syncAchievements
};
