const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { DAY_MS } = require('../src/lib/analytics/growth');
const { getGrowthConfig, validateGrowthConfig } = require('../src/config/growth');

test('RPG growth events mark second active day and seven-day return', async () => {
	const firstDay = Date.parse('2026-06-01T12:00:00.000Z');
	const record = {
		guildId: 'guild',
		userId: 'user',
		firstSeenAt: firstDay,
		activeDays: {},
		save: async () => record
	};
	const loaded = loadRpgGrowth({ record, guildRows: [] });

	try {
		await loaded.growth.recordRpgEvent({ guildId: 'guild', userId: 'user', event: 'tutorial_started', now: firstDay });
		assert.equal(record.tutorialStartedAt, firstDay);
		assert.equal(Boolean(record.secondActiveDayAt), false);

		await loaded.growth.recordRpgEvent({
			guildId: 'guild',
			userId: 'user',
			event: 'character_created',
			now: firstDay + 8 * DAY_MS
		});
		assert.equal(record.characterCreatedAt, firstDay + 8 * DAY_MS);
		assert.equal(record.secondActiveDayAt, firstDay + 8 * DAY_MS);
		assert.equal(record.retained7At, firstDay + 8 * DAY_MS);
	} finally {
		loaded.restore();
	}
});

test('RPG growth write failures are logged and exposed through diagnostics', async () => {
	const warnings = [];
	const record = {
		guildId: 'guild',
		userId: 'user',
		activeDays: {},
		save: async () => {
			throw new Error('database unavailable');
		}
	};
	const loaded = loadRpgGrowth({ record, guildRows: [] });

	try {
		loaded.growth.configureRpgGrowth({ logger: { warn: (message) => warnings.push(message) } });
		const result = await loaded.growth.recordRpgEvent({ guildId: 'guild', userId: 'user', event: 'activity' });
		const diagnostics = loaded.growth.getRpgGrowthDiagnostics();

		assert.equal(result, null);
		assert.equal(diagnostics.writeFailures, 1);
		assert.match(diagnostics.lastFailureMessage, /database unavailable/);
		assert.match(warnings[0], /was not recorded/i);
	} finally {
		loaded.growth.configureRpgGrowth();
		loaded.restore();
	}
});

test('RPG funnel identifies the largest conversion loss and compares onboarding variants', async () => {
	const now = Date.parse('2026-06-20T12:00:00.000Z');
	const joinedAt = now - DAY_MS;
	const records = [
		{
			guildId: 'rpg-guild',
			userId: 'one',
			firstSeenAt: joinedAt,
			lastActiveAt: now,
			activeDays: { '2026-06-19': true, '2026-06-20': true },
			tutorialStartedAt: joinedAt,
			characterCreatedAt: joinedAt + 1,
			firstAdventureAt: joinedAt + 2,
			firstVictoryAt: joinedAt + 3,
			secondActiveDayAt: now,
			retained7At: now
		}
	];
	const guildRows = [
		{ guildId: 'rpg-guild', cohortTrackedAt: joinedAt, onboardingVariant: 'rpg-first' },
		{ guildId: 'control-guild', cohortTrackedAt: joinedAt, onboardingVariant: 'control' }
	];
	const loaded = loadRpgGrowth({ records, guildRows });

	try {
		const analytics = await loaded.growth.getRpgGrowthAnalytics(14, now);
		assert.equal(analytics.weeklyActiveGuilds, 1);
		assert.equal(analytics.stages.find((stage) => stage.key === 'joined').count, 2);
		assert.equal(analytics.stages.find((stage) => stage.key === 'firstAdventure').count, 1);
		assert.deepEqual(
			{ from: analytics.largestLoss.from, to: analytics.largestLoss.to },
			{ from: 'joined', to: 'tutorialStarted' }
		);
		assert.equal(analytics.variants.find((variant) => variant.variant === 'rpg-first').adventureRate, 1);
		assert.equal(analytics.decisionReady, false);
		assert.equal(analytics.expectedDecisionAt, joinedAt + 28 * DAY_MS);
	} finally {
		loaded.restore();
	}
});

test('growth configuration rejects invalid modes and malformed excluded guild IDs', () => {
	const config = getGrowthConfig({
		GROWTH_ONBOARDING_EXPERIMENT: 'unknown',
		GROWTH_EXCLUDED_GUILDS: '123456789012345678,not-an-id'
	});

	assert.equal(config.experimentMode, 'rpg-first');
	assert.deepEqual(config.excludedGuildIds, ['123456789012345678']);
	assert.deepEqual(config.invalidGuildIds, ['not-an-id']);
	assert.equal(config.warnings.length, 2);
	assert.match(validateGrowthConfig({ databaseConnected: false, env: {} }).warnings.at(-1), /database is disconnected/i);
});

test('RPG export contains aggregate metrics without guild, user, or character identifiers', async () => {
	const now = Date.parse('2026-06-20T12:00:00.000Z');
	const joinedAt = now - DAY_MS;
	const loaded = loadRpgGrowth({
		records: [
			{
				guildId: '123456789012345678',
				userId: '987654321098765432',
				firstSeenAt: joinedAt,
				lastActiveAt: now,
				activeDays: { '2026-06-20': true },
				characterCreatedAt: now
			}
		],
		guildRows: [{ guildId: '123456789012345678', cohortTrackedAt: joinedAt, onboardingVariant: 'rpg-first' }]
	});

	try {
		const analytics = await loaded.growth.getRpgGrowthAnalytics(14, now);
		const exported = loaded.growth.buildRpgGrowthExport(analytics);
		const serialized = JSON.stringify(exported);

		assert.doesNotMatch(serialized, /123456789012345678/);
		assert.doesNotMatch(serialized, /987654321098765432/);
		assert.equal(exported.schemaVersion, 1);
		assert.ok(Array.isArray(exported.daily));
	} finally {
		loaded.restore();
	}
});

test('RPG data-quality diagnostics identify impossible lifecycle ordering', () => {
	const loaded = loadRpgGrowth({ records: [], guildRows: [] });
	try {
		const diagnostics = loaded.growth.diagnoseRpgGrowthData({
			records: [
				{
					guildId: 'guild',
					firstSeenAt: 100,
					firstAdventureAt: 200,
					firstVictoryAt: 150,
					secondActiveDayAt: 300,
					activeDays: { '2026-01-01': true },
					retained7At: 400
				}
			],
			guildRows: [{ guildId: 'guild' }],
			cohortRecords: [{}]
		});

		assert.equal(diagnostics.healthy, false);
		assert.equal(diagnostics.issues.adventureBeforeCharacter, 1);
		assert.equal(diagnostics.issues.victoryBeforeAdventure, 1);
		assert.equal(diagnostics.issues.invalidSecondActiveDay, 1);
		assert.equal(diagnostics.issues.earlyRetention, 1);
	} finally {
		loaded.restore();
	}
});

test('public discovery surfaces consistently position Cadia as RPG-first', () => {
	const root = path.resolve(__dirname, '..');
	const onboarding = fs.readFileSync(path.join(root, 'src/listeners/guildCreate.js'), 'utf8');
	const mention = fs.readFileSync(path.join(root, 'src/listeners/botMention.js'), 'utf8');
	const help = fs.readFileSync(path.join(root, 'src/commands/Miscellaneous/help.js'), 'utf8');
	const botInfo = fs.readFileSync(path.join(root, 'src/commands/Information/bot-info.js'), 'utf8');

	for (const source of [onboarding, mention, help, botInfo]) assert.match(source, /rpg tutorial/i);
	assert.match(onboarding, /Community Tools/);
	assert.match(help, /Community Tools/);
});

function loadRpgGrowth({ record = null, records = null, guildRows }) {
	const paths = {
		mysql: require.resolve('../src/lib/database/mysql'),
		guild: require.resolve('../src/lib/schemas/botAnalyticsGuildSchema'),
		rpg: require.resolve('../src/lib/schemas/rpgGrowthSchema'),
		growth: require.resolve('../src/lib/rpg/growth')
	};
	const originals = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, require.cache[value]]));
	const allRecords = records || (record ? [record] : []);

	class GrowthModel {
		constructor(data) {
			Object.assign(this, data);
			this.activeDays = {};
		}

		async save() {
			if (!allRecords.includes(this)) allRecords.push(this);
			return this;
		}

		static async findOne() {
			return record;
		}

		static async find() {
			return allRecords;
		}
	}

	require.cache[paths.mysql] = moduleWith({ isMysqlConnected: () => true });
	require.cache[paths.guild] = moduleWith({ BotAnalyticsGuildSchema: { find: async () => guildRows } });
	require.cache[paths.rpg] = moduleWith({ RpgGrowthSchema: GrowthModel });
	delete require.cache[paths.growth];

	return {
		growth: require(paths.growth),
		restore() {
			for (const [key, modulePath] of Object.entries(paths)) {
				if (originals[key]) require.cache[modulePath] = originals[key];
				else delete require.cache[modulePath];
			}
		}
	};
}

function moduleWith(exports) {
	return { id: 'test-double', filename: 'test-double', loaded: true, exports };
}
