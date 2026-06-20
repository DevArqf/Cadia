const { isMysqlConnected } = require('../database/mysql');
const { BotAnalyticsGuildSchema } = require('../schemas/botAnalyticsGuildSchema');
const { RpgGrowthSchema } = require('../schemas/rpgGrowthSchema');
const { DAY_MS, excludedGuildIds, isExcludedGuild } = require('../analytics/growth');
const { getGrowthConfig } = require('../../config/growth');

const EVENT_FIELDS = {
	tutorial_offered: 'tutorialOfferedAt',
	tutorial_started: 'tutorialStartedAt',
	tutorial_completed: 'tutorialCompletedAt',
	tutorial_skipped: 'tutorialSkippedAt',
	character_created: 'characterCreatedAt',
	first_adventure: 'firstAdventureAt',
	first_victory: 'firstVictoryAt'
};
let growthLogger = null;
const writeDiagnostics = {
	writeFailures: 0,
	lastFailureAt: null,
	lastFailureMessage: null
};

function configureRpgGrowth({ logger = null } = {}) {
	growthLogger = logger;
}

function getRpgGrowthDiagnostics() {
	return { ...writeDiagnostics };
}

async function recordRpgEvent({ guildId, userId, event = 'activity', now = Date.now() }) {
	if (!isMysqlConnected() || !guildId || !userId || isExcludedGuild(guildId)) return null;

	try {
		let record = await RpgGrowthSchema.findOne({ guildId, userId });
		if (!record) record = new RpgGrowthSchema({ guildId, userId, firstSeenAt: now });
		hydrate(record);
		markActivity(record, now);

		const field = EVENT_FIELDS[event];
		if (field && !record[field]) record[field] = now;
		record.updatedAt = now;
		await record.save();
		return record;
	} catch (error) {
		writeDiagnostics.writeFailures += 1;
		writeDiagnostics.lastFailureAt = Date.now();
		writeDiagnostics.lastFailureMessage = error.message;
		growthLogger?.warn?.(`RPG growth event "${event}" was not recorded: ${error.message}`);
		return null;
	}
}

async function getRpgGrowthAnalytics(days = 14, now = Date.now()) {
	const since = now - Math.max(days, 1) * DAY_MS;
	const excludedIds = excludedGuildIds();
	const [records, guildRows] = await Promise.all([RpgGrowthSchema.find(), BotAnalyticsGuildSchema.find()]);
	const excludedRecordCount = records.filter((record) => excludedIds.has(record.guildId)).length;
	const includedRecords = records.filter((record) => !excludedIds.has(record.guildId));
	const includedGuilds = guildRows.filter((guild) => !excludedIds.has(guild.guildId));
	const cohortGuilds = includedGuilds.filter((guild) => cohortTime(guild) >= since && cohortTime(guild) <= now);
	const cohortGuildIds = new Set(cohortGuilds.map((guild) => guild.guildId));
	const cohortRecords = includedRecords.filter((record) => cohortGuildIds.has(record.guildId));
	const weeklyGuilds = uniqueGuilds(
		includedRecords.filter((record) => Number(record.lastActiveAt || 0) >= now - 7 * DAY_MS)
	);
	const stages = [
		{ key: 'joined', label: 'Guild Joined', count: cohortGuilds.length },
		{ key: 'tutorialStarted', label: 'Tutorial Started', count: uniqueGuilds(cohortRecords.filter((record) => record.tutorialStartedAt)).size },
		{ key: 'characterCreated', label: 'Character Created', count: uniqueGuilds(cohortRecords.filter((record) => record.characterCreatedAt)).size },
		{ key: 'firstAdventure', label: 'First Adventure', count: uniqueGuilds(cohortRecords.filter((record) => record.firstAdventureAt)).size },
		{ key: 'firstVictory', label: 'First Victory', count: uniqueGuilds(cohortRecords.filter((record) => record.firstVictoryAt)).size },
		{ key: 'secondActiveDay', label: 'Second Active Day', count: uniqueGuilds(cohortRecords.filter((record) => record.secondActiveDayAt)).size },
		{ key: 'retained7', label: 'Seven-Day Return', count: uniqueGuilds(cohortRecords.filter((record) => record.retained7At)).size }
	];
	const variants = variantMetrics(cohortGuilds, cohortRecords);
	const experimentStartAt = cohortGuilds.length ? Math.min(...cohortGuilds.map(cohortTime)) : null;
	const experimentDays = experimentStartAt ? Math.floor((now - experimentStartAt) / DAY_MS) : 0;
	const diagnostics = diagnoseRpgGrowthData({
		records: includedRecords,
		guildRows: includedGuilds,
		cohortRecords,
		excludedRecordCount
	});
	diagnostics.writeFailures = getRpgGrowthDiagnostics();
	if (diagnostics.writeFailures.writeFailures) {
		diagnostics.healthy = false;
		diagnostics.warnings.push(`writeFailures: ${diagnostics.writeFailures.writeFailures}`);
	}

	return {
		generatedAt: now,
		days,
		weeklyActiveGuilds: weeklyGuilds.size,
		activeUsers7d: includedRecords.filter((record) => Number(record.lastActiveAt || 0) >= now - 7 * DAY_MS).length,
		stages,
		users: {
			tutorialOffered: cohortRecords.filter((record) => record.tutorialOfferedAt).length,
			tutorialStarted: cohortRecords.filter((record) => record.tutorialStartedAt).length,
			tutorialCompleted: cohortRecords.filter((record) => record.tutorialCompletedAt).length,
			tutorialSkipped: cohortRecords.filter((record) => record.tutorialSkippedAt).length,
			characterCreated: cohortRecords.filter((record) => record.characterCreatedAt).length,
			firstAdventure: cohortRecords.filter((record) => record.firstAdventureAt).length,
			firstVictory: cohortRecords.filter((record) => record.firstVictoryAt).length,
			secondActiveDay: cohortRecords.filter((record) => record.secondActiveDayAt).length,
			retained7: cohortRecords.filter((record) => record.retained7At).length
		},
		variants,
		experimentStartAt,
		expectedDecisionAt: experimentStartAt ? experimentStartAt + 28 * DAY_MS : null,
		experimentDays,
		decisionReady: experimentDays >= 28 && variants.every((variant) => variant.joined >= 30),
		largestLoss: largestFunnelLoss(stages),
		daily: dailyRpgTotals(cohortRecords),
		diagnostics,
		configuration: {
			experimentMode: getGrowthConfig().experimentMode,
			excludedGuildCount: excludedIds.size
		}
	};
}

function diagnoseRpgGrowthData({ records, guildRows, cohortRecords, excludedRecordCount = 0 }) {
	const guildIds = new Set(guildRows.map((guild) => guild.guildId));
	const issues = {
		orphanRecords: records.filter((record) => !guildIds.has(record.guildId)).length,
		adventureBeforeCharacter: records.filter(
			(record) => record.firstAdventureAt && (!record.characterCreatedAt || record.firstAdventureAt < record.characterCreatedAt)
		).length,
		victoryBeforeAdventure: records.filter(
			(record) => record.firstVictoryAt && (!record.firstAdventureAt || record.firstVictoryAt < record.firstAdventureAt)
		).length,
		invalidSecondActiveDay: records.filter(
			(record) => record.secondActiveDayAt && Object.keys(record.activeDays || {}).length < 2
		).length,
		earlyRetention: records.filter(
			(record) => record.retained7At && record.retained7At < Number(record.firstSeenAt || 0) + 7 * DAY_MS
		).length,
		excludedRecordCount
	};
	const warnings = [];
	if (!cohortRecords.length) warnings.push('No RPG cohort activity exists for this reporting window.');
	for (const [key, count] of Object.entries(issues)) {
		if (count) warnings.push(`${key}: ${count}`);
	}
	return {
		healthy: warnings.length === 0,
		issues,
		warnings
	};
}

function dailyRpgTotals(records) {
	const eventFields = [
		'tutorialStartedAt',
		'tutorialCompletedAt',
		'tutorialSkippedAt',
		'characterCreatedAt',
		'firstAdventureAt',
		'firstVictoryAt',
		'secondActiveDayAt',
		'retained7At'
	];
	const rows = new Map();
	for (const record of records) {
		for (const field of eventFields) {
			if (!record[field]) continue;
			const day = new Date(record[field]).toISOString().slice(0, 10);
			if (!rows.has(day)) rows.set(day, { day });
			rows.get(day)[field] = (rows.get(day)[field] || 0) + 1;
		}
	}
	return [...rows.values()].sort((left, right) => left.day.localeCompare(right.day));
}

function buildRpgGrowthExport(analytics) {
	return {
		schemaVersion: 1,
		generatedAt: analytics.generatedAt,
		reportingDays: analytics.days,
		configuration: analytics.configuration,
		experiment: {
			startAt: analytics.experimentStartAt,
			expectedDecisionAt: analytics.expectedDecisionAt,
			elapsedDays: analytics.experimentDays,
			decisionReady: analytics.decisionReady
		},
		northStar: {
			weeklyRpgActiveGuilds: analytics.weeklyActiveGuilds,
			activeUsers7d: analytics.activeUsers7d
		},
		stages: analytics.stages,
		users: analytics.users,
		variants: analytics.variants,
		largestLoss: analytics.largestLoss,
		daily: analytics.daily,
		dataQuality: analytics.diagnostics
	};
}

function markActivity(record, now) {
	const day = new Date(now).toISOString().slice(0, 10);
	record.activeDays[day] = true;
	record.lastActiveAt = now;
	const activeDayCount = Object.keys(record.activeDays).length;
	if (activeDayCount >= 2 && !record.secondActiveDayAt) record.secondActiveDayAt = now;
	if (now - record.firstSeenAt >= 7 * DAY_MS && !record.retained7At) record.retained7At = now;
}

function largestFunnelLoss(stages) {
	let largest = null;
	for (let index = 1; index < stages.length; index++) {
		const previous = stages[index - 1];
		const current = stages[index];
		const loss = Math.max(previous.count - current.count, 0);
		const rate = previous.count ? loss / previous.count : 0;
		if (!largest || rate > largest.rate) largest = { from: previous.key, to: current.key, loss, rate };
	}
	return largest;
}

function variantMetrics(guilds, records) {
	return ['control', 'rpg-first'].map((variant) => {
		const variantGuilds = guilds.filter((guild) => normalizeVariant(guild.onboardingVariant) === variant);
		const ids = new Set(variantGuilds.map((guild) => guild.guildId));
		const variantRecords = records.filter((record) => ids.has(record.guildId));
		const tutorialGuilds = uniqueGuilds(variantRecords.filter((record) => record.tutorialStartedAt)).size;
		const characterGuilds = uniqueGuilds(variantRecords.filter((record) => record.characterCreatedAt)).size;
		const adventureGuilds = uniqueGuilds(variantRecords.filter((record) => record.firstAdventureAt)).size;
		const removed = variantGuilds.filter((guild) => guild.leftAt && guild.leftAt >= cohortTime(guild)).length;
		return {
			variant,
			joined: variantGuilds.length,
			tutorialGuilds,
			characterGuilds,
			adventureGuilds,
			characterRate: ratio(characterGuilds, variantGuilds.length),
			adventureRate: ratio(adventureGuilds, variantGuilds.length),
			removalRate: ratio(removed, variantGuilds.length)
		};
	});
}

function normalizeVariant(variant) {
	return variant === 'guided' ? 'rpg-first' : variant || 'control';
}

function uniqueGuilds(records) {
	return new Set(records.map((record) => record.guildId));
}

function cohortTime(guild) {
	return Number(guild.cohortTrackedAt || 0);
}

function ratio(part, total) {
	return total ? part / total : 0;
}

function hydrate(record) {
	record.activeDays ||= {};
	record.firstSeenAt ||= Date.now();
}

module.exports = {
	EVENT_FIELDS,
	buildRpgGrowthExport,
	configureRpgGrowth,
	diagnoseRpgGrowthData,
	getRpgGrowthDiagnostics,
	getRpgGrowthAnalytics,
	largestFunnelLoss,
	recordRpgEvent
};
