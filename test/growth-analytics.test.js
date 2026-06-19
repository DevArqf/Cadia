const assert = require('node:assert/strict');
const test = require('node:test');
const { Collection, PermissionFlagsBits } = require('discord.js');
const {
	DAY_MS,
	calculateGrowthMetrics,
	commandCategory,
	commandPathFromInteraction,
	isMeaningfulCommand,
	selectOnboardingVariant
} = require('../src/lib/analytics/growth');
const { invitePermissions } = require('../src/config/invite');
const { buildOnboardingEmbed, findOnboardingChannel } = require('../src/listeners/guildCreate');

test('meaningful activity excludes low-intent and developer commands while preserving RPG subcommands', () => {
	const interaction = {
		commandName: 'rpg',
		options: {
			getSubcommandGroup: () => null,
			getSubcommand: () => 'adventure'
		}
	};
	const commandPath = commandPathFromInteraction(interaction);

	assert.equal(commandPath, 'rpg adventure');
	assert.equal(commandCategory({ location: { full: 'src/commands/Systems/RPG System/rpg.js' } }, commandPath), 'rpg');
	assert.equal(isMeaningfulCommand({ commandPath: 'help', category: 'miscellaneous' }), false);
	assert.equal(isMeaningfulCommand({ commandPath, category: 'rpg' }), true);
	assert.equal(isMeaningfulCommand({ commandPath: 'eval', category: 'developer', isDeveloper: true }), false);
});

test('growth metrics count unique weekly active guilds and exclude configured guilds', () => {
	const now = Date.parse('2026-06-19T12:00:00.000Z');
	const dailyRows = [
		{ day: '2026-06-18', growthInstrumentedAt: now, meaningfulGuilds: { one: true, two: true, excluded: true } },
		{ day: '2026-06-19', growthInstrumentedAt: now, meaningfulGuilds: { one: true } }
	];

	const growth = calculateGrowthMetrics({
		dailyRows,
		guildRows: [],
		now,
		days: 14,
		excludedIds: new Set(['excluded'])
	});

	assert.equal(growth.weeklyActiveGuilds, 2);
	assert.equal(growth.instrumentedDays, 2);
	assert.equal(growth.baselineReady, false);
});

test('cohort boundaries, activation, and retention use only instrumented joins', () => {
	const now = Date.parse('2026-06-19T12:00:00.000Z');
	const inside = now - 14 * DAY_MS;
	const guildRows = [
		{
			guildId: 'activated',
			cohortTrackedAt: inside,
			onboardingDeliveredAt: inside + 1,
			firstMeaningfulCommandAt: inside + 2,
			activatedAt: inside + 3,
			retained7At: inside + 7 * DAY_MS,
			retained30At: null,
			onboardingVariant: 'guided'
		},
		{
			guildId: 'outside',
			cohortTrackedAt: inside - 1,
			activatedAt: inside,
			retained7At: inside,
			onboardingVariant: 'control'
		},
		{
			guildId: 'legacy-without-cohort',
			joinedAt: now - 100 * DAY_MS,
			activatedAt: now - 90 * DAY_MS
		}
	];

	const growth = calculateGrowthMetrics({ dailyRows: [], guildRows, now, days: 14 });

	assert.equal(growth.joinedGuilds, 1);
	assert.equal(growth.activatedGuilds, 1);
	assert.equal(growth.activationRate, 1);
	assert.equal(growth.retention7.eligible, 2);
	assert.equal(growth.retention7.retained, 1);
	assert.equal(growth.retention30.eligible, 0);
});

test('onboarding experiment assignment is stable and invite permissions exclude Administrator', () => {
	assert.equal(selectOnboardingVariant('123', 'split'), selectOnboardingVariant('123', 'split'));
	assert.ok(['control', 'guided'].includes(selectOnboardingVariant('123', 'split')));
	assert.equal(invitePermissions.includes(PermissionFlagsBits.Administrator), false);
});

test('guided onboarding emphasizes setup and keeps RPG optional', () => {
	const embed = buildOnboardingEmbed(
		{
			name: 'Test Guild',
			client: { user: { displayAvatarURL: () => 'https://example.com/avatar.png' } }
		},
		'guided'
	).toJSON();

	assert.match(embed.description, /Start with server setup/);
	assert.match(embed.description, /Optional RPG path/);
});

test('onboarding channel selection prefers an eligible system channel', () => {
	const eligible = createChannel('system', 10, true);
	const earlier = createChannel('earlier', 1, true);
	const guild = {
		members: { me: { id: 'bot' } },
		systemChannel: eligible,
		channels: { cache: new Collection([[earlier.id, earlier], [eligible.id, eligible]]) }
	};

	assert.equal(findOnboardingChannel(guild), eligible);
});

function createChannel(id, rawPosition, allowed) {
	return {
		id,
		rawPosition,
		type: 0,
		isTextBased: () => true,
		permissionsFor: () => ({ has: () => allowed })
	};
}

test('repeat joins reset the installation cohort and database failures are swallowed', async () => {
	const existingGuild = {
		guildId: 'guild',
		joinedAt: 1,
		currentJoinedAt: 2,
		cohortTrackedAt: 2,
		joinCount: 2,
		meaningfulCommands: { kick: true },
		activeDays: { '2026-01-01': true },
		commandCategories: { moderation: 1 },
		activatedAt: 3,
		save: async () => existingGuild
	};
	const daily = {
		day: '2026-06-19',
		guildJoins: 0,
		meaningfulGuilds: {},
		commandCategories: {},
		commandErrorsByName: {},
		commandDeniedByName: {},
		onboardingVariants: {},
		save: async () => daily
	};
	const loaded = loadAnalyticsWithModels({ existingGuild, daily });

	try {
		await loaded.analytics.recordGuildJoin({ id: 'guild', name: 'Guild', memberCount: 10 });
		assert.equal(existingGuild.joinCount, 3);
		assert.deepEqual(existingGuild.meaningfulCommands, {});
		assert.equal(existingGuild.activatedAt, null);

		daily.save = async () => {
			throw new Error('database unavailable');
		};
		await assert.doesNotReject(() => loaded.analytics.recordGuildJoin({ id: 'guild', name: 'Guild', memberCount: 10 }));
	} finally {
		loaded.restore();
	}
});

test('activation requires two distinct meaningful command paths', async () => {
	const existingGuild = {
		guildId: 'guild',
		joinedAt: Date.now(),
		currentJoinedAt: Date.now(),
		cohortTrackedAt: Date.now(),
		joinCount: 1,
		commandRuns: 0,
		meaningfulCommands: {},
		activeDays: {},
		commandCategories: {},
		activatedAt: null,
		save: async () => existingGuild
	};
	const daily = createDaily();
	const loaded = loadAnalyticsWithModels({ existingGuild, daily });
	const input = {
		user: { id: 'user' },
		guild: { id: 'guild', name: 'Guild', memberCount: 10 },
		commandCategory: 'moderation',
		meaningful: true
	};

	try {
		await loaded.analytics.recordCommandRun({ ...input, commandName: 'kick' });
		await loaded.analytics.recordCommandRun({ ...input, commandName: 'kick' });
		assert.equal(existingGuild.activatedAt, null);

		await loaded.analytics.recordCommandRun({ ...input, commandName: 'mute' });
		assert.ok(existingGuild.activatedAt);
		assert.deepEqual(Object.keys(existingGuild.meaningfulCommands).sort(), ['kick', 'mute']);
	} finally {
		loaded.restore();
	}
});

function loadAnalyticsWithModels({ existingGuild, daily }) {
	const paths = {
		mysql: require.resolve('../src/lib/database/mysql'),
		daily: require.resolve('../src/lib/schemas/botAnalyticsDailySchema'),
		guild: require.resolve('../src/lib/schemas/botAnalyticsGuildSchema'),
		user: require.resolve('../src/lib/schemas/botAnalyticsUserSchema'),
		analytics: require.resolve('../src/lib/util/botAnalytics')
	};
	const originals = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, require.cache[value]]));
	class GuildModel {
		static async findOne() {
			return existingGuild;
		}
	}
	const existingUser = {
		userId: 'user',
		commandRuns: 0,
		guildIds: {},
		save: async () => existingUser
	};

	require.cache[paths.mysql] = moduleWith({ isMysqlConnected: () => true });
	require.cache[paths.daily] = moduleWith({
		BotAnalyticsDailySchema: {
			findOne: async () => daily,
			create: async () => daily,
			find: async () => [daily]
		}
	});
	require.cache[paths.guild] = moduleWith({ BotAnalyticsGuildSchema: GuildModel });
	require.cache[paths.user] = moduleWith({
		BotAnalyticsUserSchema: class UserModel {
			static async find() {
				return [existingUser];
			}

			static async findOne() {
				return existingUser;
			}
		}
	});
	delete require.cache[paths.analytics];

	return {
		analytics: require(paths.analytics),
		restore() {
			for (const [key, path] of Object.entries(paths)) {
				if (originals[key]) require.cache[path] = originals[key];
				else delete require.cache[path];
			}
		}
	};
}

function moduleWith(exports) {
	return { id: 'test-double', filename: 'test-double', loaded: true, exports };
}

function createDaily() {
	return {
		day: '2026-06-19',
		commandRuns: 0,
		messageCommandRuns: 0,
		slashCommandRuns: 0,
		newUsers: 0,
		guildJoins: 0,
		uniqueCommandUsers: {},
		commands: {},
		guilds: {},
		meaningfulGuilds: {},
		commandCategories: {},
		commandErrorsByName: {},
		commandDeniedByName: {},
		onboardingVariants: {},
		save: async function save() {
			return this;
		}
	};
}
