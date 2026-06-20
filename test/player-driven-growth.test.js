const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { createAchievementShareCard, createCharacterShareCard } = require('../src/lib/rpg/shareCard');
const { createSeasonCard } = require('../src/lib/rpg/seasonCanvas');
const { createPlayerGrowthHandlers } = require('../src/lib/rpg/command/playerGrowthView');
const { componentReply, notice, panel } = require('../src/lib/util/components');

test('shareable character and achievement cards render PNG attachments', () => {
	const profile = {
		characterId: 'RPG-ABC123',
		name: 'Aster',
		level: 8,
		battlesWon: 14,
		region: 'broken-gate',
		gold: 500,
		relicShards: 3
	};
	const character = createCharacterShareCard({ profile, userName: 'warden', cosmetic: 'Stormglass Aura' });
	const achievement = createAchievementShareCard({
		profile,
		userName: 'warden',
		achievement: { id: 'first-blood', name: 'First Blood', description: 'Win your first encounter.' }
	});

	assert.match(character.name, /\.png$/);
	assert.match(achievement.name, /\.png$/);
	assert.ok(character.attachment.length > 1_000);
	assert.ok(achievement.attachment.length > 1_000);
});

test('season card renders quest progress and reward as a PNG attachment', () => {
	const attachment = createSeasonCard({
		season: {
			id: '2026-q2',
			name: 'Stormglass',
			endsAt: Date.parse('2026-07-01T00:00:00Z'),
			quest: { victories: 5, activeDays: 3 },
			cosmetic: { name: 'Stormglass Aura', rarity: 'Limited' }
		},
		progress: { victories: 3, activeDays: 2 }
	});

	assert.equal(attachment.name, 'rpg-season.png');
	assert.ok(attachment.attachment.length > 10_000);
	assert.deepEqual([...attachment.attachment.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test('global leaderboards sort across guilds and seasonal rewards are unique per season', async () => {
	const loaded = loadGrowth({
		profiles: [profile('one', 'guild-a', { level: 4, gold: 100 }), profile('two', 'guild-b', { level: 9, gold: 50 })]
	});

	try {
		const leaders = await loaded.module.globalLeaderboard('level');
		assert.deepEqual(
			leaders.map((entry) => entry.userId),
			['two', 'one']
		);
		const first = loaded.module.currentSeason(new Date('2026-01-15T00:00:00Z'));
		const second = loaded.module.currentSeason(new Date('2026-04-15T00:00:00Z'));
		assert.notEqual(first.cosmetic.id, second.cosmetic.id);
		assert.ok(first.endsAt > first.startsAt);
	} finally {
		loaded.restore();
	}
});

test('referrals reward both players with cosmetics and cannot be self-redeemed', async () => {
	const profiles = [profile('referrer', 'guild'), profile('new-player', 'guild')];
	const growthRecords = [growthRecord('referrer', { referralCode: 'CADIA-REF123' }), growthRecord('new-player', { referralCode: 'CADIA-NEW123' })];
	const loaded = loadGrowth({ profiles, growthRecords });

	try {
		const result = await loaded.module.redeemReferral('new-player', 'CADIA-REF123');
		assert.equal(result.growth.referredBy, 'referrer');
		assert.equal(result.referrer.referrals, 1);
		assert.ok(result.growth.cosmetics.includes('gatebound-crest'));
		assert.ok(result.referrer.cosmetics.includes('gatebound-crest'));
		assert.ok(loaded.transactionEvents.includes('lock:rpg:player:new-player'));
		assert.ok(loaded.transactionEvents.includes('lock:rpg:referral:CADIA-REF123'));
		await assert.rejects(() => loaded.module.redeemReferral('referrer', 'CADIA-REF123'), /own referral/i);
	} finally {
		loaded.restore();
	}
});

test('server boss aggregates player damage, enforces cooldown, and rewards contributors', async () => {
	const profiles = [profile('one', 'guild', { level: 10 }), profile('two', 'guild', { level: 8 })];
	const growthRecords = [growthRecord('one'), growthRecord('two')];
	const boss = bossRecord('guild');
	boss.hp = 100;
	boss.maxHp = 100;
	const loaded = loadGrowth({ profiles, growthRecords, boss });
	const now = Date.parse('2026-06-20T12:00:00Z');

	try {
		const result = await loaded.module.attackServerBoss('guild', 'one', now);
		assert.equal(result.defeated, true);
		assert.equal(result.boss.status, 'defeated');
		assert.ok(growthRecords[0].cosmetics.includes('worldbreaker-sigil'));
		assert.ok(loaded.transactionEvents.includes('lock:rpg:boss:guild:2026-q2'));
		assert.ok(loaded.transactionEvents.includes('lock:rpg:player:one'));

		boss.status = 'active';
		boss.hp = boss.maxHp;
		await assert.rejects(() => loaded.module.attackServerBoss('guild', 'one', now + 1_000), /attack again/i);
	} finally {
		loaded.restore();
	}
});

test('seasonal quest requires in-season victories and active days before cosmetic claim', async () => {
	const userProfile = profile('one', 'guild');
	const player = growthRecord('one');
	const now = new Date();
	const seasonId = `${now.getUTCFullYear()}-q${Math.floor(now.getUTCMonth() / 3) + 1}`;
	player.seasonVictories[seasonId] = 5;
	const quarterStart = Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1);
	const activity = {
		userId: 'one',
		activeDays: {
			[new Date(quarterStart).toISOString().slice(0, 10)]: true,
			[new Date(quarterStart + 86_400_000).toISOString().slice(0, 10)]: true,
			[new Date(quarterStart + 2 * 86_400_000).toISOString().slice(0, 10)]: true
		}
	};
	const loaded = loadGrowth({ profiles: [userProfile], growthRecords: [player], activities: [activity] });

	try {
		const status = await loaded.module.seasonalProgress('one');
		assert.equal(status.complete, true);
		const claimed = await loaded.module.claimSeason('one');
		assert.equal(claimed.growth.seasonClaims.includes(seasonId), true);
		assert.ok(claimed.growth.cosmetics.some((id) => id.endsWith(seasonId)));
	} finally {
		loaded.restore();
	}
});

test('season handler edits an acknowledged interaction after database work', async () => {
	let edited = null;
	const handlers = createPlayerGrowthHandlers({
		actionButton: () => null,
		color: { RPG: '#5946b2', success: '#46b26b' },
		componentReply,
		createAchievementShareCard: () => null,
		createCharacterShareCard: () => null,
		createRpgLeaderboardCard: () => null,
		createSeasonCard,
		growth: {
			seasonalProgress: async () => ({
				season: {
					id: '2026-q2',
					name: 'Stormglass',
					endsAt: Date.parse('2026-07-01T00:00:00Z'),
					quest: { victories: 5, activeDays: 3 },
					cosmetic: { name: 'Stormglass Aura' }
				},
				progress: { victories: 1, activeDays: 1 },
				complete: false,
				claimed: false
			})
		},
		icon: {
			arrowRight: '>',
			calendar: 'calendar',
			clock: 'clock',
			compass: 'compass',
			coin: 'coin',
			loot: 'loot',
			rank: { s: 'rank' },
			shards: 'shards',
			success: 'success'
		},
		notice,
		panel,
		service: { RpgError: Error }
	});
	const interaction = {
		deferred: true,
		user: { id: 'user' },
		options: { getString: () => 'view' },
		editReply: async (payload) => {
			edited = payload;
			return payload;
		},
		reply: async () => assert.fail('season should edit the deferred interaction')
	};

	await handlers.season(interaction);

	assert.ok(edited);
	assert.ok(edited.components.length > 0);
	assert.equal(edited.files.length, 1);
	assert.equal(edited.files[0].name, 'rpg-season-2026-q2.png');
	assert.equal(edited.flags, 32768);
});

function loadGrowth({ profiles = [], growthRecords = [], activities = [], boss = null }) {
	const paths = {
		profile: require.resolve('../src/lib/schemas/RPG System/rpgProfileSchema'),
		activity: require.resolve('../src/lib/schemas/rpgGrowthSchema'),
		player: require.resolve('../src/lib/schemas/rpgPlayerGrowthSchema'),
		boss: require.resolve('../src/lib/schemas/rpgServerBossSchema'),
		mysql: require.resolve('../src/lib/database/mysql'),
		module: require.resolve('../src/lib/rpg/playerGrowth')
	};
	const originals = Object.fromEntries(Object.entries(paths).map(([key, modulePath]) => [key, require.cache[modulePath]]));
	const transactionEvents = [];

	class PlayerModel {
		constructor(data) {
			Object.assign(this, growthRecord(data.userId), data);
		}
		async save() {
			if (!growthRecords.includes(this)) growthRecords.push(this);
			return this;
		}
		static async findOne(filter) {
			return growthRecords.find((entry) => Object.entries(filter).every(([key, value]) => entry[key] === value)) || null;
		}
		static async findOneForUpdate(filter) {
			return this.findOne(filter);
		}
		static async find() {
			return growthRecords;
		}
	}
	class BossModel {
		static async findOne() {
			return boss;
		}
		static async findOneForUpdate() {
			return boss;
		}
		static async create(data) {
			return Object.assign(bossRecord(data.guildId), data);
		}
	}

	require.cache[paths.profile] = moduleWith({
		RpgProfileSchema: {
			find: async () => profiles,
			findOne: async ({ userId }) => profiles.find((entry) => entry.userId === userId) || null
		}
	});
	require.cache[paths.activity] = moduleWith({
		RpgGrowthSchema: { findOne: async ({ userId }) => activities.find((entry) => entry.userId === userId) || null }
	});
	require.cache[paths.player] = moduleWith({ RpgPlayerGrowthSchema: PlayerModel });
	require.cache[paths.boss] = moduleWith({ RpgServerBossSchema: BossModel });
	require.cache[paths.mysql] = moduleWith({
		acquireTransactionLock: async (name) => transactionEvents.push(`lock:${name}`),
		withTransaction: async (operation) => {
			transactionEvents.push('begin');
			try {
				const result = await operation();
				transactionEvents.push('commit');
				return result;
			} catch (error) {
				transactionEvents.push('rollback');
				throw error;
			}
		}
	});
	delete require.cache[paths.module];

	return {
		module: require(paths.module),
		transactionEvents,
		restore() {
			for (const [key, modulePath] of Object.entries(paths)) {
				if (originals[key]) require.cache[modulePath] = originals[key];
				else delete require.cache[modulePath];
			}
		}
	};
}

function profile(userId, guildId, overrides = {}) {
	return {
		userId,
		guildId,
		level: 1,
		gold: 0,
		relicShards: 0,
		battlesWon: 0,
		defeatedBosses: [],
		stats: { attack: 5 },
		...overrides
	};
}

function growthRecord(userId, overrides = {}) {
	const record = {
		userId,
		referralCode: `CADIA-${userId.toUpperCase()}`,
		referredBy: null,
		referrals: 0,
		cosmetics: [],
		achievements: [],
		seasonClaims: [],
		seasonVictories: {},
		shareCount: 0,
		save: async () => record,
		...overrides
	};
	return record;
}

function bossRecord(guildId) {
	const record = {
		guildId,
		seasonId: '2026-q2',
		name: 'Test Colossus',
		maxHp: 100,
		hp: 100,
		status: 'active',
		contributions: {},
		lastAttacks: {},
		save: async () => record
	};
	return record;
}

function moduleWith(exports) {
	return { id: 'test-double', filename: 'test-double', loaded: true, exports };
}
