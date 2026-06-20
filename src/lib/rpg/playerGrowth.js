const { randomBytes } = require('node:crypto');
const { RpgProfileSchema } = require('../schemas/RPG System/rpgProfileSchema');
const { RpgGrowthSchema } = require('../schemas/rpgGrowthSchema');
const { RpgPlayerGrowthSchema } = require('../schemas/rpgPlayerGrowthSchema');
const { RpgServerBossSchema } = require('../schemas/rpgServerBossSchema');
const { acquireTransactionLock, withTransaction } = require('../database/mysql');

const BOSS_ATTACK_COOLDOWN = 30 * 60_000;
const cosmetics = {
	seasonal: { id: 'stormglass-aura', name: 'Stormglass Aura', rarity: 'Limited' },
	referral: { id: 'gatebound-crest', name: 'Gatebound Crest', rarity: 'Referral' },
	raid: { id: 'worldbreaker-sigil', name: 'Worldbreaker Sigil', rarity: 'Cooperative' }
};
const achievements = [
	{ id: 'first-blood', name: 'First Blood', description: 'Win your first encounter.', test: (profile) => profile.battlesWon >= 1 },
	{ id: 'veteran', name: 'Veteran Warden', description: 'Win 25 encounters.', test: (profile) => profile.battlesWon >= 25 },
	{ id: 'boss-breaker', name: 'Boss Breaker', description: 'Defeat your first boss.', test: (profile) => profile.defeatedBosses.length >= 1 },
	{ id: 'rank-ten', name: 'Relic Vanguard', description: 'Reach Rank 10.', test: (profile) => profile.level >= 10 }
];

function currentSeason(now = new Date()) {
	const year = now.getUTCFullYear();
	const quarter = Math.floor(now.getUTCMonth() / 3);
	const startsAt = Date.UTC(year, quarter * 3, 1);
	const endsAt = Date.UTC(year, quarter * 3 + 3, 1);
	const id = `${year}-q${quarter + 1}`;
	return {
		id,
		name: ['Frostwake', 'Stormglass', 'Sunscar', 'Nightfall'][quarter],
		startsAt,
		endsAt,
		quest: { victories: 5, activeDays: 3 },
		cosmetic: { ...cosmetics.seasonal, id: `${cosmetics.seasonal.id}-${id}` }
	};
}

async function globalLeaderboard(type = 'level', limit = 100) {
	const profiles = await RpgProfileSchema.find({});
	return profiles.sort((a, b) => compareProfiles(a, b, type)).slice(0, limit);
}

async function getPlayerGrowth(userId) {
	return withLockedAggregates([playerLock(userId)], () => loadPlayerGrowth(userId, true));
}

async function loadPlayerGrowth(userId, forUpdate = false) {
	const findOne = forUpdate && RpgPlayerGrowthSchema.findOneForUpdate ? 'findOneForUpdate' : 'findOne';
	let record = await RpgPlayerGrowthSchema[findOne]({ userId });
	if (!record) record = new RpgPlayerGrowthSchema({ userId, referralCode: createReferralCode() });
	hydrate(record);
	await record.save();
	return record;
}

async function syncAchievements(profile) {
	return withLockedAggregates([playerLock(profile.userId)], async () => {
		const growth = await loadPlayerGrowth(profile.userId, true);
		const unlocked = achievements.filter((achievement) => achievement.test(profile));
		const newlyUnlocked = [];
		for (const achievement of unlocked) {
			if (!growth.achievements.includes(achievement.id)) {
				growth.achievements.push(achievement.id);
				newlyUnlocked.push(achievement);
			}
		}
		growth.updatedAt = Date.now();
		await growth.save();
		return { unlocked, newlyUnlocked };
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

async function recordShare(userId) {
	return withLockedAggregates([playerLock(userId)], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		growth.shareCount += 1;
		growth.lastSharedAt = Date.now();
		growth.updatedAt = Date.now();
		await growth.save();
		return growth;
	});
}

async function redeemReferral(userId, code) {
	const profile = await RpgProfileSchema.findOne({ userId });
	if (!profile) throw new Error('Create your Warden before redeeming a referral code.');
	const referralCode = String(code).trim().toUpperCase();
	return withLockedAggregates([playerLock(userId), `rpg:referral:${referralCode}`], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		if (growth.referredBy) throw new Error('You already redeemed a referral code.');
		const findOne = RpgPlayerGrowthSchema.findOneForUpdate ? 'findOneForUpdate' : 'findOne';
		const referrer = await RpgPlayerGrowthSchema[findOne]({ referralCode });
		if (!referrer) throw new Error('That referral code does not exist.');
		if (referrer.userId === userId) throw new Error('You cannot redeem your own referral code.');

		growth.referredBy = referrer.userId;
		addCosmetic(growth, cosmetics.referral.id);
		referrer.referrals = (referrer.referrals || 0) + 1;
		addCosmetic(referrer, cosmetics.referral.id);
		growth.updatedAt = referrer.updatedAt = Date.now();
		await Promise.all([growth.save(), referrer.save()]);
		return { growth, referrer, cosmetic: cosmetics.referral };
	});
}

async function seasonalProgress(userId, lockedGrowth = null) {
	const season = currentSeason();
	const [profile, activity, growth] = await Promise.all([
		RpgProfileSchema.findOne({ userId }),
		RpgGrowthSchema.findOne({ userId }),
		lockedGrowth || getPlayerGrowth(userId)
	]);
	if (!profile) throw new Error('Create your Warden to participate in the season.');
	const activeDays = Object.keys(activity?.activeDays || {}).filter((day) => {
		const timestamp = Date.parse(`${day}T00:00:00.000Z`);
		return timestamp >= season.startsAt && timestamp < season.endsAt;
	}).length;
	const progress = {
		victories: Math.min(growth.seasonVictories[season.id] || 0, season.quest.victories),
		activeDays: Math.min(activeDays, season.quest.activeDays)
	};
	return {
		season,
		progress,
		complete: progress.victories >= season.quest.victories && progress.activeDays >= season.quest.activeDays,
		claimed: growth.seasonClaims.includes(season.id),
		growth
	};
}

async function claimSeason(userId) {
	return withLockedAggregates([playerLock(userId)], async () => {
		const growth = await loadPlayerGrowth(userId, true);
		const status = await seasonalProgress(userId, growth);
		if (!status.complete) throw new Error('Complete the seasonal quest before claiming its cosmetic.');
		if (status.claimed) throw new Error('You already claimed this season reward.');
		status.growth.seasonClaims.push(status.season.id);
		addCosmetic(status.growth, status.season.cosmetic.id);
		status.growth.updatedAt = Date.now();
		await status.growth.save();
		return status;
	});
}

async function getServerBoss(guildId, now = Date.now()) {
	const season = currentSeason(new Date(now));
	return withLockedAggregates([bossLock(guildId, season.id)], () => loadServerBoss(guildId, season, now, true));
}

async function loadServerBoss(guildId, season, now, forUpdate = false) {
	const findOne = forUpdate && RpgServerBossSchema.findOneForUpdate ? 'findOneForUpdate' : 'findOne';
	let boss = await RpgServerBossSchema[findOne]({ guildId, seasonId: season.id });
	if (!boss) {
		boss = await RpgServerBossSchema.create({
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
		const [profile, boss] = await Promise.all([
			RpgProfileSchema.findOne({ userId }),
			loadServerBoss(guildId, season, now, true)
		]);
		if (!profile) throw new Error('Create your Warden before joining the server boss event.');
		if (boss.status === 'defeated') throw new Error('Your server already defeated this seasonal boss.');
		const lastAttack = Number(boss.lastAttacks[userId] || 0);
		if (now - lastAttack < BOSS_ATTACK_COOLDOWN) {
			throw new Error(`You can attack again <t:${Math.ceil((lastAttack + BOSS_ATTACK_COOLDOWN) / 1000)}:R>.`);
		}
		const damage = Math.max(
			100,
			Math.round((profile.level || 1) * 120 + (profile.stats?.attack || 5) * 18 + (profile.battlesWon || 0) * 4)
		);
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
		await acquireTransactionLock(playerLock(userId));
		const growth = await loadPlayerGrowth(userId, true);
		addCosmetic(growth, cosmetics.raid.id);
		growth.updatedAt = Date.now();
		await growth.save();
	}
}

async function withLockedAggregates(lockNames, operation) {
	return withTransaction(async () => {
		for (const lockName of [...new Set(lockNames)].sort()) await acquireTransactionLock(lockName);
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

function addCosmetic(growth, cosmeticId) {
	if (!growth.cosmetics.includes(cosmeticId)) growth.cosmetics.push(cosmeticId);
}

function hydrate(record) {
	record.cosmetics ||= [];
	record.achievements ||= [];
	record.seasonClaims ||= [];
	record.seasonVictories ||= {};
	record.referrals ||= 0;
	record.shareCount ||= 0;
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
	claimSeason,
	cosmetics,
	currentSeason,
	getPlayerGrowth,
	getServerBoss,
	globalLeaderboard,
	recordShare,
	recordSeasonVictory,
	redeemReferral,
	seasonalProgress,
	syncAchievements
};
