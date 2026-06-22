const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { createAchievementShareCard, createCharacterShareCard } = require('../src/lib/rpg/shareCard');
const { createSeasonCard } = require('../src/lib/rpg/seasonCanvas');
const { createPlayerGrowthHandlers } = require('../src/lib/rpg/command/playerGrowthView');
const { serverBossImage } = require('../src/lib/rpg/assets');
const { componentReply, notice, panel } = require('../src/lib/util/components');

test('shareable character and achievement cards render PNG attachments', async () => {
	const profile = {
		characterId: 'RPG-ABC123',
		name: 'Aster',
		level: 8,
		battlesWon: 14,
		region: 'broken-gate',
		gold: 500,
		relicShards: 3
	};
	const character = await createCharacterShareCard({
		profile,
		userName: 'warden',
		badge: {
			name: 'Stormglass Pathfinder',
			image: 'Stormglass Pathfinder.png',
			emojiKey: 'StormglassPathfinder'
		}
	});
	const achievement = await createAchievementShareCard({
		profile,
		userName: 'warden',
		achievement: { id: 'first-blood', name: 'First Blood', description: 'Win your first encounter.' }
	});

	assert.match(character.name, /\.png$/);
	assert.match(achievement.name, /\.png$/);
	assert.ok(character.attachment.length > 1_000);
	assert.ok(achievement.attachment.length > 1_000);
});

test('season card renders quest progress and reward emoji as a PNG attachment', async () => {
	const attachment = await createSeasonCard({
		season: {
			id: '2026-summer',
			name: 'Summer',
			endsAt: Date.parse('2026-09-01T00:00:00Z'),
			quest: { victories: 5, consecutiveDays: 3 },
			item: { name: 'Stormglass Aura', rarity: 'Limited', emoji: '<:StormglassAura:1518462673485041714>' }
		},
		progress: { victories: 3, consecutiveDays: 2 }
	});

	assert.equal(attachment.name, 'rpg-season.png');
	assert.ok(attachment.attachment.length > 10_000);
	assert.deepEqual([...attachment.attachment.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test('server boss assets provide distinct active and defeated images', () => {
	const active = serverBossImage('active');
	const defeated = serverBossImage('defeated');

	assert.equal(active.url, 'attachment://stormglass-colossus-battle.png');
	assert.equal(active.attachment.name, 'stormglass-colossus-battle.png');
	assert.equal(defeated.url, 'attachment://stormglass-colossus-defeat.png');
	assert.equal(defeated.attachment.name, 'stormglass-colossus-defeat.png');
	assert.ok(active.attachment.attachment.length > 1_000_000);
	assert.ok(defeated.attachment.attachment.length > 1_000_000);
});

test('server boss responses switch from battle art to defeat art', async () => {
	let status = 'active';
	const replies = [];
	const handlers = createPlayerGrowthHandlers({
		actionButton: () => null,
		color: { RPG: '#5946b2', success: '#46b26b' },
		componentReply,
		createAchievementShareCard: () => null,
		createCharacterShareCard: () => null,
		createRpgLeaderboardCard: () => null,
		createSeasonCard,
		growth: {
			rewards: {
				raid: {
					item: { name: 'Worldbreaker Sigil' },
					badge: { name: 'Worldbreaker' }
				}
			},
			getServerBoss: async () => ({
				name: 'Stormglass Colossus',
				status,
				hp: status === 'defeated' ? 0 : 5_000,
				maxHp: 5_000,
				contributions: {}
			})
		},
		icon: {
			arrowRight: '>',
			coin: 'coin',
			damageDealt: 'damage',
			health: { full: 'health' },
			loot: 'loot',
			person: 'person',
			rank: { s: 'rank' },
			shards: 'shards',
			success: 'success',
			threat: 'threat'
		},
		notice,
		panel,
		serverBossImage,
		service: { RpgError: Error }
	});
	const interaction = {
		guild: { id: 'guild' },
		user: { id: 'user' },
		options: { getString: () => 'view' },
		reply: async (payload) => replies.push(payload)
	};

	await handlers.serverBoss(interaction);
	status = 'defeated';
	await handlers.serverBoss(interaction);

	assert.equal(replies[0].files[0].name, 'stormglass-colossus-battle.png');
	assert.equal(replies[1].files[0].name, 'stormglass-colossus-defeat.png');
	assert.match(JSON.stringify(replies[0].components), /attachment:\/\/stormglass-colossus-battle\.png/);
	assert.match(JSON.stringify(replies[1].components), /attachment:\/\/stormglass-colossus-defeat\.png/);
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
		const second = loaded.module.currentSeason(new Date('2026-06-22T00:00:00Z'));
		assert.notEqual(first.id, second.id);
		assert.equal(first.name, 'Winter');
		assert.equal(second.id, '2026-summer');
		assert.equal(second.name, 'Summer');
		assert.equal(second.startsAt, Date.parse('2026-06-01T00:00:00Z'));
		assert.equal(second.endsAt, Date.parse('2026-09-01T00:00:00Z'));
		assert.equal(first.item.id, 'stormglass_aura');
		assert.ok(first.endsAt > first.startsAt);
	} finally {
		loaded.restore();
	}
});

test('reading existing player growth does not open a write transaction', async () => {
	const player = growthRecord('reader');
	const loaded = loadGrowth({ growthRecords: [player] });

	try {
		const result = await loaded.module.getPlayerGrowth('reader');
		assert.equal(result, player);
		assert.deepEqual(loaded.transactionEvents, []);
	} finally {
		loaded.restore();
	}
});

test('achievements atomically award currency and a special badge only once', async () => {
	const userProfile = profile('winner', 'guild', { battlesWon: 1 });
	const player = growthRecord('winner');
	const loaded = loadGrowth({ profiles: [userProfile], growthRecords: [player] });

	try {
		const first = await loaded.module.syncAchievements(userProfile);
		assert.deepEqual(
			first.newlyUnlocked.map((entry) => entry.id),
			['first-blood']
		);
		assert.equal(first.rewards.gold, 150);
		assert.equal(first.rewards.shards, 0);
		assert.equal(userProfile.gold, 150);
		assert.ok(player.badges.includes('bloodmarked'));
		assert.equal(player.featuredBadge, 'bloodmarked');
		assert.ok(loaded.transactionEvents.includes('lock:rpg:player:winner'));

		const second = await loaded.module.syncAchievements(userProfile);
		assert.deepEqual(second.newlyUnlocked, []);
		assert.equal(second.rewards.gold, 0);
		assert.equal(userProfile.gold, 150);
		assert.equal(player.badges.filter((badgeId) => badgeId === 'bloodmarked').length, 1);
	} finally {
		loaded.restore();
	}
});

test('existing achievement records receive their badge without retroactive currency', async () => {
	const userProfile = profile('veteran', 'guild', { battlesWon: 25 });
	const player = growthRecord('veteran', { achievements: ['first-blood', 'veteran'] });
	const loaded = loadGrowth({ profiles: [userProfile], growthRecords: [player] });

	try {
		const migrated = await loaded.module.getPlayerGrowth('veteran');
		assert.ok(migrated.badges.includes('bloodmarked'));
		assert.ok(migrated.badges.includes('veteran-warden'));
		assert.equal(userProfile.gold, 0);
	} finally {
		loaded.restore();
	}
});

test('referrals reward both players with items and badges and cannot be self-redeemed', async () => {
	const profiles = [profile('referrer', 'guild'), profile('new-player', 'guild')];
	const growthRecords = [growthRecord('referrer', { referralCode: 'CADIA-REF123' }), growthRecord('new-player', { referralCode: 'CADIA-NEW123' })];
	const loaded = loadGrowth({ profiles, growthRecords });

	try {
		const result = await loaded.module.redeemReferral('new-player', 'CADIA-REF123');
		assert.equal(result.growth.referredBy, 'referrer');
		assert.equal(result.referrer.referrals, 1);
		assert.ok(result.growth.badges.includes('gatebound-guide'));
		assert.ok(result.referrer.badges.includes('gatebound-guide'));
		assert.ok(result.profile.inventory.some((entry) => entry.itemId === 'gatebound_crest'));
		assert.ok(result.referrerProfile.inventory.some((entry) => entry.itemId === 'gatebound_crest'));
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
		assert.ok(growthRecords[0].badges.includes('worldbreaker'));
		assert.ok(profiles[0].inventory.some((entry) => entry.itemId === 'worldbreaker_sigil'));
		assert.ok(loaded.transactionEvents.includes('lock:rpg:boss:guild:2026-summer'));
		assert.ok(loaded.transactionEvents.includes('lock:rpg:player:one'));

		boss.status = 'active';
		boss.hp = boss.maxHp;
		await assert.rejects(() => loaded.module.attackServerBoss('guild', 'one', now + 1_000), /attack again/i);
	} finally {
		loaded.restore();
	}
});

test('seasonal quest migrates analytics activity and requires three consecutive RPG days', async () => {
	const userProfile = profile('one', 'guild');
	const player = growthRecord('one');
	const seasonId = '2026-summer';
	player.seasonVictories['2026-q2'] = 5;
	const activity = {
		userId: 'one',
		activeDays: {
			'2026-06-19': true,
			'2026-06-20': true,
			'2026-06-21': true
		}
	};
	const loaded = loadGrowth({ profiles: [userProfile], growthRecords: [player], activities: [activity] });

	try {
		const status = await loaded.module.seasonalProgress('one');
		assert.equal(status.complete, true);
		assert.equal(status.progress.consecutiveDays, 3);
		assert.deepEqual(Object.keys(player.seasonActiveDays[seasonId]).sort(), ['2026-06-19', '2026-06-20', '2026-06-21']);
		const claimed = await loaded.module.claimSeason('one');
		assert.equal(claimed.growth.seasonClaims.includes(seasonId), true);
		assert.ok(claimed.growth.badges.includes('stormglass-pathfinder'));
		assert.ok(claimed.profile.inventory.some((entry) => entry.itemId === 'stormglass_aura'));
	} finally {
		loaded.restore();
	}
});

test('season activity counts once per UTC day and resets a broken streak', async () => {
	const player = growthRecord('streak');
	const loaded = loadGrowth({ growthRecords: [player] });

	try {
		assert.equal(await loaded.module.recordSeasonActivity('streak', new Date('2026-06-18T23:00:00Z')), 1);
		assert.equal(await loaded.module.recordSeasonActivity('streak', new Date('2026-06-19T10:00:00Z')), 2);
		assert.equal(await loaded.module.recordSeasonActivity('streak', new Date('2026-06-19T22:00:00Z')), 2);
		assert.equal(await loaded.module.recordSeasonActivity('streak', new Date('2026-06-21T10:00:00Z')), 2);
		assert.equal(await loaded.module.recordSeasonActivity('streak', new Date('2026-06-22T10:00:00Z')), 2);
		assert.equal(await loaded.module.recordSeasonActivity('streak', new Date('2026-06-23T10:00:00Z')), 3);
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
			recordSeasonActivity: async () => 1,
			seasonalProgress: async () => ({
				season: {
					id: '2026-summer',
					name: 'Summer',
					endsAt: Date.parse('2026-09-01T00:00:00Z'),
					quest: { victories: 5, consecutiveDays: 3 },
					item: { name: 'Stormglass Aura' },
					badge: { name: 'Stormglass Pathfinder' }
				},
				progress: { victories: 1, consecutiveDays: 1 },
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
		serverBossImage,
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
	assert.equal(edited.files[0].name, 'rpg-season-2026-summer.png');
	assert.equal(edited.flags, 32768);
});

test('players can feature an unlocked badge on profiles and shared cards', async () => {
	let reply;
	const handlers = createPlayerGrowthHandlers({
		actionButton: () => null,
		color: { RPG: '#5946b2', success: '#46b26b' },
		componentReply,
		createAchievementShareCard: () => null,
		createCharacterShareCard: () => null,
		createRpgLeaderboardCard: () => null,
		createSeasonCard,
		growth: {
			setFeaturedBadge: async (_userId, badgeId) => ({
				badge: { id: badgeId, name: 'Worldbreaker', emojiKey: 'WorldBreaker', image: 'Worldbreaker.png' },
				growth: { featuredBadge: badgeId }
			})
		},
		icon: {
			coin: 'coin',
			rank: { s: 'rank' },
			shards: 'shards',
			success: 'success'
		},
		notice,
		panel,
		serverBossImage,
		service: { RpgError: Error }
	});

	await handlers.badge({
		options: { getString: () => 'worldbreaker' },
		reply: async (payload) => {
			reply = payload;
		},
		user: { id: 'user' }
	});

	assert.match(JSON.stringify(reply), /Badge Featured: Worldbreaker/);
	assert.match(JSON.stringify(reply), /1518485000633188482/);
});

test('achievement handler shows progress, rewards, and badge ownership', async () => {
	let reply;
	const handlers = createPlayerGrowthHandlers({
		actionButton: () => null,
		color: { RPG: '#5946b2', success: '#46b26b' },
		componentReply,
		createAchievementShareCard: () => null,
		createCharacterShareCard: () => null,
		createRpgLeaderboardCard: () => null,
		createSeasonCard,
		growth: {
			achievements: [
				{
					id: 'first-blood',
					name: 'First Blood',
					category: 'Combat',
					description: 'Win your first encounter.',
					badgeId: 'bloodmarked',
					rewards: { gold: 150, shards: 0 }
				}
			],
			badges: { bloodmarked: { name: 'Bloodmarked', emojiKey: 'Bloodmarked', image: 'Bloodmarked.png' } },
			syncAchievements: async () => ({ growth: { achievements: ['first-blood'] } })
		},
		icon: {
			coin: '<coin>',
			rank: { s: 'rank' },
			shards: '<shards>',
			success: '<success>'
		},
		notice,
		panel,
		serverBossImage,
		service: { RpgError: Error, requireProfile: async () => profile('user', 'guild') }
	});

	await handlers.achievements({
		guild: { id: 'guild' },
		user: { id: 'user' },
		reply: async (payload) => {
			reply = payload;
		}
	});

	const serialized = JSON.stringify(reply);
	assert.match(serialized, /Warden Achievements/);
	assert.match(serialized, /First Blood/);
	assert.match(serialized, /<coin>.*150 Gold/);
	assert.match(serialized, /Bloodmarked Badge/);
	assert.match(serialized, /1518484987844759633/);
	assert.doesNotMatch(serialized, /<badge>|<combat>|<rewards>|<achievement>/);
});

test('legacy cosmetic rewards migrate into usable items and profile badges', async () => {
	const userProfile = profile('legacy', 'guild');
	const player = growthRecord('legacy', {
		cosmetics: ['stormglass-aura-2026-q2', 'gatebound-crest', 'worldbreaker-sigil']
	});
	const loaded = loadGrowth({ profiles: [userProfile], growthRecords: [player] });

	try {
		const migrated = await loaded.module.getPlayerGrowth('legacy');
		assert.deepEqual(migrated.badges.sort(), ['gatebound-guide', 'stormglass-pathfinder', 'worldbreaker']);
		assert.deepEqual(userProfile.inventory.map((entry) => entry.itemId).sort(), ['gatebound_crest', 'stormglass_aura', 'worldbreaker_sigil']);
	} finally {
		loaded.restore();
	}
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
		RpgGrowthSchema: {
			find: async ({ userId } = {}) => activities.filter((entry) => !userId || entry.userId === userId),
			findOne: async ({ userId }) => activities.find((entry) => entry.userId === userId) || null
		}
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
	const record = {
		userId,
		guildId,
		level: 1,
		gold: 0,
		relicShards: 0,
		battlesWon: 0,
		defeatedBosses: [],
		stats: { attack: 5 },
		inventory: [],
		...overrides
	};
	record.save ||= async () => record;
	return record;
}

function growthRecord(userId, overrides = {}) {
	const record = {
		userId,
		referralCode: `CADIA-${userId.toUpperCase()}`,
		referredBy: null,
		referrals: 0,
		cosmetics: [],
		badges: [],
		featuredBadge: null,
		achievements: [],
		seasonClaims: [],
		seasonVictories: {},
		seasonActiveDays: {},
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
