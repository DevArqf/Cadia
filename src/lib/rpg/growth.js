const { isMysqlConnected } = require('../database/mysql');
const { BotAnalyticsGuildSchema } = require('../schemas/botAnalyticsGuildSchema');
const { RpgGrowthSchema } = require('../schemas/rpgGrowthSchema');
const { DAY_MS, excludedGuildIds, isExcludedGuild } = require('../analytics/growth');

const EVENT_FIELDS = {
	tutorial_offered: 'tutorialOfferedAt',
	tutorial_started: 'tutorialStartedAt',
	tutorial_completed: 'tutorialCompletedAt',
	tutorial_skipped: 'tutorialSkippedAt',
	character_created: 'characterCreatedAt',
	first_adventure: 'firstAdventureAt',
	first_victory: 'firstVictoryAt'
};

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
	} catch {
		return null;
	}
}

async function getRpgGrowthAnalytics(days = 14, now = Date.now()) {
	const since = now - Math.max(days, 1) * DAY_MS;
	const excludedIds = excludedGuildIds();
	const [records, guildRows] = await Promise.all([RpgGrowthSchema.find(), BotAnalyticsGuildSchema.find()]);
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
		experimentDays,
		decisionReady: experimentDays >= 28 && variants.every((variant) => variant.joined >= 30),
		largestLoss: largestFunnelLoss(stages)
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
	getRpgGrowthAnalytics,
	largestFunnelLoss,
	recordRpgEvent
};
