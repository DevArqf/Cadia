const { isMysqlConnected } = require('../database/mysql');
const { BotAnalyticsDailySchema } = require('../schemas/botAnalyticsDailySchema');
const { BotAnalyticsGuildSchema } = require('../schemas/botAnalyticsGuildSchema');
const { BotAnalyticsUserSchema } = require('../schemas/botAnalyticsUserSchema');
const {
	ACTIVATION_COMMAND_COUNT,
	calculateGrowthMetrics,
	excludedGuildIds,
	isExcludedGuild,
	markRetention,
	normalizeCommandPath
} = require('../analytics/growth');

const maxTopEntries = 10;
let analyticsLogger = null;
const writeDiagnostics = {
	writeFailures: 0,
	lastFailureAt: null,
	lastFailureMessage: null,
	lastOperation: null
};

function configureBotAnalytics({ logger = null } = {}) {
	analyticsLogger = logger;
}

function getBotAnalyticsDiagnostics() {
	return { ...writeDiagnostics };
}

async function recordCommandRun({ client, user, guild, commandName, commandCategory = 'other', meaningful = false, type = 'slash' }) {
	if (!canTrack() || isExcludedGuild(guild?.id)) return;

	await swallow('recordCommandRun', async () => {
		const now = Date.now();
		const normalizedCommand = normalizeCommandPath(commandName);
		const day = await getDaily();
		const userDocument = user ? await touchUser(user.id, guild?.id) : { isNew: false };
		const guildDocument = guild ? await touchGuild(guild) : null;

		day.commandRuns += 1;
		if (type === 'message') day.messageCommandRuns += 1;
		else day.slashCommandRuns += 1;
		if (user?.id) day.uniqueCommandUsers[user.id] = true;
		if (userDocument.isNew) day.newUsers += 1;
		incrementMap(day.commands, normalizedCommand);
		if (guild?.id) incrementMap(day.guilds, guild.id);
		if (meaningful && guild?.id) {
			day.meaningfulCommandRuns += 1;
			day.meaningfulGuilds[guild.id] = true;
			incrementMap(day.commandCategories, commandCategory);
		}
		day.updatedAt = Date.now();
		await day.save();

		if (userDocument.document) {
			userDocument.document.commandRuns += 1;
			userDocument.document.lastSeenAt = Date.now();
			await userDocument.document.save();
		}

		if (guildDocument) {
			guildDocument.commandRuns += 1;
			guildDocument.lastSeenAt = now;
			if (!guildDocument.firstCommandAt) guildDocument.firstCommandAt = now;
			if (meaningful) {
				if (!guildDocument.firstMeaningfulCommandAt) guildDocument.firstMeaningfulCommandAt = now;
				guildDocument.lastActiveAt = now;
				guildDocument.lastActiveDay = day.day;
				guildDocument.meaningfulCommands[normalizedCommand] = true;
				guildDocument.activeDays[day.day] = true;
				incrementMap(guildDocument.commandCategories, commandCategory);
				if (!guildDocument.activatedAt && Object.keys(guildDocument.meaningfulCommands).length >= ACTIVATION_COMMAND_COUNT) {
					guildDocument.activatedAt = now;
				}
				markRetention(guildDocument, now);
			}
			await guildDocument.save();
		}

		void client;
	});
}

async function recordCommandError({ client, interaction, commandName }) {
	await incrementDailyCounter('commandErrors', {
		client,
		guildId: interaction?.guild?.id,
		commandName: normalizeCommandPath(commandName || interaction?.commandName),
		detailMap: 'commandErrorsByName'
	});
}

async function recordCommandDenied({ client, interaction, commandName }) {
	await incrementDailyCounter('commandDenied', {
		client,
		guildId: interaction?.guild?.id,
		commandName: normalizeCommandPath(commandName || interaction?.commandName),
		detailMap: 'commandDeniedByName'
	});
}

async function recordGuildJoin(guild) {
	if (!canTrack() || !guild || isExcludedGuild(guild.id)) return;

	await swallow('recordGuildJoin', async () => {
		const now = Date.now();
		const day = await getDaily();
		day.guildJoins += 1;
		day.updatedAt = now;
		await day.save();

		let document = await BotAnalyticsGuildSchema.findOne({ guildId: guild.id });
		if (!document) {
			document = new BotAnalyticsGuildSchema({ guildId: guild.id, joinedAt: now, currentJoinedAt: now, cohortTrackedAt: now });
		} else {
			hydrateGuildDocument(document);
			document.currentJoinedAt = now;
			document.cohortTrackedAt = now;
			document.joinCount = (document.joinCount || 0) + 1;
		}
		document.leftAt = null;
		document.memberCount = guild.memberCount || 0;
		document.lastSeenAt = now;
		document.firstCommandAt = null;
		document.firstMeaningfulCommandAt = null;
		document.activatedAt = null;
		document.lastActiveAt = null;
		document.lastActiveDay = null;
		document.retained7At = null;
		document.retained30At = null;
		document.meaningfulCommands = {};
		document.activeDays = {};
		document.commandCategories = {};
		document.onboardingDeliveredAt = null;
		document.onboardingDeliveryTarget = null;
		document.onboardingFailedAt = null;
		document.onboardingError = null;
		await document.save();
	});
}

async function recordGuildLeave(guild) {
	if (!canTrack() || !guild || isExcludedGuild(guild.id)) return;

	await swallow('recordGuildLeave', async () => {
		const day = await getDaily();
		day.guildLeaves += 1;
		day.updatedAt = Date.now();
		await day.save();

		let document = await BotAnalyticsGuildSchema.findOne({ guildId: guild.id });
		if (!document) document = new BotAnalyticsGuildSchema({ guildId: guild.id, name: guild.name });
		hydrateGuildDocument(document);
		document.name = guild.name;
		document.leftAt = Date.now();
		document.lastSeenAt = Date.now();
		document.memberCount = guild.memberCount || document.memberCount || 0;
		await document.save();
	});
}

async function recordMemberJoin(member) {
	if (!canTrack() || !member || isExcludedGuild(member.guild?.id)) return;

	await swallow('recordMemberJoin', async () => {
		const day = await getDaily();
		day.memberJoins += 1;
		day.updatedAt = Date.now();
		await day.save();
		const guildDocument = await touchGuild(member.guild);
		await guildDocument.save();
	});
}

async function recordMemberLeave(member) {
	if (!canTrack() || !member || isExcludedGuild(member.guild?.id)) return;

	await swallow('recordMemberLeave', async () => {
		const day = await getDaily();
		day.memberLeaves += 1;
		day.updatedAt = Date.now();
		await day.save();
		if (member.guild) {
			const guildDocument = await touchGuild(member.guild);
			await guildDocument.save();
		}
	});
}

async function recordOnboardingOutcome(guild, { variant, delivered, target = null, error = null }) {
	if (!canTrack() || !guild || isExcludedGuild(guild.id)) return;

	await swallow('recordOnboardingOutcome', async () => {
		const now = Date.now();
		const day = await getDaily();
		const document = await touchGuild(guild);
		document.onboardingVariant = variant;
		incrementMap(day.onboardingVariants, variant);

		if (delivered) {
			day.onboardingDelivered += 1;
			document.onboardingDeliveredAt = now;
			document.onboardingDeliveryTarget = target;
			document.onboardingFailedAt = null;
			document.onboardingError = null;
		} else {
			day.onboardingFailed += 1;
			document.onboardingFailedAt = now;
			document.onboardingError = String(error?.message || error || 'No eligible onboarding destination');
		}

		day.updatedAt = now;
		await day.save();
		await document.save();
	});
}

async function getBotAnalytics(client, days = 14) {
	const since = Date.now() - Math.max(days, 1) * 86_400_000;
	const excludedIds = excludedGuildIds();
	const dailyRows = (await BotAnalyticsDailySchema.find())
		.filter((row) => dayToTimestamp(row.day) >= since)
		.sort((a, b) => a.day.localeCompare(b.day));
	const users = await BotAnalyticsUserSchema.find();
	const guildRows = (await BotAnalyticsGuildSchema.find()).filter((guild) => !excludedIds.has(guild.guildId));
	const currentGuilds = [...(client?.guilds?.cache?.values?.() || [])].filter((guild) => !excludedIds.has(guild.id));
	const currentGuildIds = new Set(currentGuilds.map((guild) => guild.id));
	const currentGuildMembers = currentGuilds.reduce((total, guild) => total + (guild.memberCount || 0), 0);
	const activeGuildRows = guildRows.filter((guild) => !guild.leftAt || currentGuildIds.has(guild.guildId));

	const totals = dailyRows.reduce(
		(summary, day) => {
			summary.commandRuns += day.commandRuns || 0;
			summary.slashCommandRuns += day.slashCommandRuns || 0;
			summary.messageCommandRuns += day.messageCommandRuns || 0;
			summary.commandErrors += day.commandErrors || 0;
			summary.commandDenied += day.commandDenied || 0;
			summary.meaningfulCommandRuns += day.meaningfulCommandRuns || 0;
			summary.onboardingDelivered += day.onboardingDelivered || 0;
			summary.onboardingFailed += day.onboardingFailed || 0;
			summary.newUsers += day.newUsers || 0;
			summary.memberJoins += day.memberJoins || 0;
			summary.memberLeaves += day.memberLeaves || 0;
			summary.guildJoins += day.guildJoins || 0;
			summary.guildLeaves += day.guildLeaves || 0;
			mergeCounts(summary.commands, day.commands);
			mergeCounts(summary.guilds, filterGuildCounts(day.guilds, excludedIds));
			mergeCounts(summary.commandCategories, day.commandCategories);
			for (const userId of Object.keys(day.uniqueCommandUsers || {})) summary.uniqueCommandUsers.add(userId);
			return summary;
		},
		{
			commandRuns: 0,
			slashCommandRuns: 0,
			messageCommandRuns: 0,
			commandErrors: 0,
			commandDenied: 0,
			meaningfulCommandRuns: 0,
			onboardingDelivered: 0,
			onboardingFailed: 0,
			newUsers: 0,
			memberJoins: 0,
			memberLeaves: 0,
			guildJoins: 0,
			guildLeaves: 0,
			commands: {},
			guilds: {},
			commandCategories: {},
			uniqueCommandUsers: new Set()
		}
	);
	const growth = calculateGrowthMetrics({ dailyRows, guildRows, now: Date.now(), days, excludedIds });

	return {
		generatedAt: Date.now(),
		days,
		current: {
			guilds: currentGuilds.length,
			totalMemberCount: currentGuildMembers,
			trackedUsers: users.length,
			trackedGuilds: activeGuildRows.length,
			uptimeMs: client?.uptime || 0,
			wsPing: client?.ws?.ping ?? null
		},
		totals: {
			...totals,
			uniqueCommandUsers: totals.uniqueCommandUsers.size
		},
		growth,
		daily: dailyRows.map((day) => ({
			day: day.day,
			commandRuns: day.commandRuns || 0,
			uniqueCommandUsers: Object.keys(day.uniqueCommandUsers || {}).length,
			newUsers: day.newUsers || 0,
			memberJoins: day.memberJoins || 0,
			memberLeaves: day.memberLeaves || 0,
			guildJoins: day.guildJoins || 0,
			guildLeaves: day.guildLeaves || 0,
			commandErrors: day.commandErrors || 0,
			commandDenied: day.commandDenied || 0,
			meaningfulCommandRuns: day.meaningfulCommandRuns || 0,
			onboardingDelivered: day.onboardingDelivered || 0,
			onboardingFailed: day.onboardingFailed || 0
		})),
		topCommands: topCounts(totals.commands),
		topGuilds: topCounts(totals.guilds).map((entry) => ({ ...entry, name: resolveGuildName(client, guildRows, entry.key) })),
		topTrackedGuilds: guildRows
			.sort((a, b) => (b.commandRuns || 0) - (a.commandRuns || 0))
			.slice(0, maxTopEntries)
			.map((guild) => ({
				id: guild.guildId,
				name: guild.name || guild.guildId,
				commandRuns: guild.commandRuns || 0,
				memberCount: guild.memberCount || 0
			})),
		recentUsers: users
			.sort((a, b) => (b.firstSeenAt || 0) - (a.firstSeenAt || 0))
			.slice(0, maxTopEntries)
			.map((user) => ({ id: user.userId, firstSeenAt: user.firstSeenAt, commandRuns: user.commandRuns || 0 }))
	};
}

async function incrementDailyCounter(counter, { client, guildId, commandName, detailMap } = {}) {
	if (!canTrack() || isExcludedGuild(guildId)) return;

	await swallow(`incrementDailyCounter:${counter}`, async () => {
		const day = await getDaily();
		day[counter] = (day[counter] || 0) + 1;
		if (commandName && detailMap) incrementMap(day[detailMap], commandName);
		day.updatedAt = Date.now();
		await day.save();
		void client;
	});
}

async function touchUser(userId, guildId) {
	if (!userId) return { document: null, isNew: false };
	let document = await BotAnalyticsUserSchema.findOne({ userId });
	const isNew = !document;
	if (!document) document = new BotAnalyticsUserSchema({ userId });
	document.lastSeenAt = Date.now();
	if (guildId) document.guildIds[guildId] = true;
	return { document, isNew };
}

async function touchGuild(guild) {
	let document = await BotAnalyticsGuildSchema.findOne({ guildId: guild.id });
	if (!document) {
		const now = Date.now();
		document = new BotAnalyticsGuildSchema({ guildId: guild.id, joinedAt: now, currentJoinedAt: now });
	}
	hydrateGuildDocument(document);
	document.name = guild.name;
	document.memberCount = guild.memberCount || document.memberCount || 0;
	document.lastSeenAt = Date.now();
	return document;
}

async function getDaily(day = dayKey()) {
	let document = await BotAnalyticsDailySchema.findOne({ day });
	if (!document) document = await BotAnalyticsDailySchema.create({ day });
	hydrateDailyDocument(document);
	return document;
}

function canTrack() {
	return isMysqlConnected();
}

async function swallow(operationName, operation) {
	try {
		await operation();
	} catch (error) {
		writeDiagnostics.writeFailures += 1;
		writeDiagnostics.lastFailureAt = Date.now();
		writeDiagnostics.lastFailureMessage = error.message;
		writeDiagnostics.lastOperation = operationName;
		analyticsLogger?.warn?.(`Bot analytics operation "${operationName}" failed: ${error.message}`);
		return null;
	}
}

function incrementMap(map, key, amount = 1) {
	if (!key) return;
	map[key] = (map[key] || 0) + amount;
}

function mergeCounts(target, source = {}) {
	for (const [key, value] of Object.entries(source || {})) incrementMap(target, key, value || 0);
}

function topCounts(counts = {}) {
	return Object.entries(counts)
		.sort(([, left], [, right]) => right - left)
		.slice(0, maxTopEntries)
		.map(([key, count]) => ({ key, count }));
}

function resolveGuildName(client, guildRows, guildId) {
	return client?.guilds?.cache?.get?.(guildId)?.name || guildRows.find((guild) => guild.guildId === guildId)?.name || guildId;
}

function filterGuildCounts(counts = {}, excludedIds) {
	return Object.fromEntries(Object.entries(counts || {}).filter(([guildId]) => !excludedIds.has(guildId)));
}

function hydrateDailyDocument(document) {
	document.meaningfulCommandRuns ||= 0;
	document.meaningfulGuilds ||= {};
	document.commandCategories ||= {};
	document.commandErrorsByName ||= {};
	document.commandDeniedByName ||= {};
	document.onboardingDelivered ||= 0;
	document.onboardingFailed ||= 0;
	document.onboardingVariants ||= {};
	document.growthInstrumentedAt ||= Date.now();
}

function hydrateGuildDocument(document) {
	document.currentJoinedAt ||= document.joinedAt || Date.now();
	document.joinCount ||= 1;
	document.meaningfulCommands ||= {};
	document.activeDays ||= {};
	document.commandCategories ||= {};
	document.onboardingVariant ||= 'control';
}

function dayKey(date = new Date()) {
	return date.toISOString().slice(0, 10);
}

function dayToTimestamp(day) {
	return Number.isNaN(Date.parse(`${day}T00:00:00.000Z`)) ? 0 : Date.parse(`${day}T00:00:00.000Z`);
}

module.exports = {
	configureBotAnalytics,
	getBotAnalyticsDiagnostics,
	getBotAnalytics,
	recordCommandDenied,
	recordCommandError,
	recordCommandRun,
	recordGuildJoin,
	recordGuildLeave,
	recordMemberJoin,
	recordMemberLeave,
	recordOnboardingOutcome
};
