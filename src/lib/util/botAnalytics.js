const { isMysqlConnected } = require('../database/mysql');
const { BotAnalyticsDailySchema } = require('../schemas/botAnalyticsDailySchema');
const { BotAnalyticsGuildSchema } = require('../schemas/botAnalyticsGuildSchema');
const { BotAnalyticsUserSchema } = require('../schemas/botAnalyticsUserSchema');

const maxTopEntries = 10;

async function recordCommandRun({ client, user, guild, commandName, type = 'slash' }) {
	if (!canTrack()) return;

	await swallow(async () => {
		const day = await getDaily();
		const userDocument = user ? await touchUser(user.id, guild?.id) : { isNew: false };
		const guildDocument = guild ? await touchGuild(guild) : null;

		day.commandRuns += 1;
		if (type === 'message') day.messageCommandRuns += 1;
		else day.slashCommandRuns += 1;
		if (user?.id) day.uniqueCommandUsers[user.id] = true;
		if (userDocument.isNew) day.newUsers += 1;
		incrementMap(day.commands, normalizeCommandName(commandName));
		if (guild?.id) incrementMap(day.guilds, guild.id);
		day.updatedAt = Date.now();
		await day.save();

		if (userDocument.document) {
			userDocument.document.commandRuns += 1;
			userDocument.document.lastSeenAt = Date.now();
			await userDocument.document.save();
		}

		if (guildDocument) {
			guildDocument.commandRuns += 1;
			guildDocument.lastSeenAt = Date.now();
			await guildDocument.save();
		}

		void client;
	});
}

async function recordCommandError({ client, interaction, commandName }) {
	await incrementDailyCounter('commandErrors', {
		client,
		userId: interaction?.user?.id,
		guildId: interaction?.guild?.id,
		commandName: normalizeCommandName(commandName || interaction?.commandName)
	});
}

async function recordCommandDenied({ client, interaction, commandName }) {
	await incrementDailyCounter('commandDenied', {
		client,
		userId: interaction?.user?.id,
		guildId: interaction?.guild?.id,
		commandName: normalizeCommandName(commandName || interaction?.commandName)
	});
}

async function recordGuildJoin(guild) {
	if (!canTrack() || !guild) return;

	await swallow(async () => {
		const day = await getDaily();
		day.guildJoins += 1;
		day.updatedAt = Date.now();
		await day.save();

		const document = await touchGuild(guild);
		document.leftAt = null;
		document.memberCount = guild.memberCount || 0;
		document.lastSeenAt = Date.now();
		await document.save();
	});
}

async function recordGuildLeave(guild) {
	if (!canTrack() || !guild) return;

	await swallow(async () => {
		const day = await getDaily();
		day.guildLeaves += 1;
		day.updatedAt = Date.now();
		await day.save();

		let document = await BotAnalyticsGuildSchema.findOne({ guildId: guild.id });
		if (!document) document = new BotAnalyticsGuildSchema({ guildId: guild.id, name: guild.name });
		document.name = guild.name;
		document.leftAt = Date.now();
		document.lastSeenAt = Date.now();
		document.memberCount = guild.memberCount || document.memberCount || 0;
		await document.save();
	});
}

async function recordMemberJoin(member) {
	if (!canTrack() || !member) return;

	await swallow(async () => {
		const day = await getDaily();
		const userDocument = await touchUser(member.id, member.guild?.id);
		day.memberJoins += 1;
		if (userDocument.isNew) day.newUsers += 1;
		day.updatedAt = Date.now();
		await day.save();
		if (userDocument.document) await userDocument.document.save();
		const guildDocument = await touchGuild(member.guild);
		await guildDocument.save();
	});
}

async function recordMemberLeave(member) {
	if (!canTrack() || !member) return;

	await swallow(async () => {
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

async function getBotAnalytics(client, days = 14) {
	const since = Date.now() - Math.max(days, 1) * 86_400_000;
	const dailyRows = (await BotAnalyticsDailySchema.find())
		.filter((row) => dayToTimestamp(row.day) >= since)
		.sort((a, b) => a.day.localeCompare(b.day));
	const users = await BotAnalyticsUserSchema.find();
	const guildRows = await BotAnalyticsGuildSchema.find();
	const currentGuilds = [...(client?.guilds?.cache?.values?.() || [])];
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
			summary.newUsers += day.newUsers || 0;
			summary.memberJoins += day.memberJoins || 0;
			summary.memberLeaves += day.memberLeaves || 0;
			summary.guildJoins += day.guildJoins || 0;
			summary.guildLeaves += day.guildLeaves || 0;
			mergeCounts(summary.commands, day.commands);
			mergeCounts(summary.guilds, day.guilds);
			for (const userId of Object.keys(day.uniqueCommandUsers || {})) summary.uniqueCommandUsers.add(userId);
			return summary;
		},
		{
			commandRuns: 0,
			slashCommandRuns: 0,
			messageCommandRuns: 0,
			commandErrors: 0,
			commandDenied: 0,
			newUsers: 0,
			memberJoins: 0,
			memberLeaves: 0,
			guildJoins: 0,
			guildLeaves: 0,
			commands: {},
			guilds: {},
			uniqueCommandUsers: new Set()
		}
	);

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
			commandDenied: day.commandDenied || 0
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

async function incrementDailyCounter(counter, { client, userId, guildId, commandName } = {}) {
	if (!canTrack()) return;

	await swallow(async () => {
		const day = await getDaily();
		day[counter] = (day[counter] || 0) + 1;
		if (userId) day.uniqueCommandUsers[userId] = true;
		if (commandName) incrementMap(day.commands, commandName);
		if (guildId) incrementMap(day.guilds, guildId);
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
	if (!document) document = new BotAnalyticsGuildSchema({ guildId: guild.id, joinedAt: Date.now() });
	document.name = guild.name;
	document.memberCount = guild.memberCount || document.memberCount || 0;
	document.lastSeenAt = Date.now();
	return document;
}

async function getDaily(day = dayKey()) {
	let document = await BotAnalyticsDailySchema.findOne({ day });
	if (!document) document = await BotAnalyticsDailySchema.create({ day });
	return document;
}

function canTrack() {
	return isMysqlConnected();
}

async function swallow(operation) {
	try {
		await operation();
	} catch {
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

function normalizeCommandName(commandName) {
	return String(commandName || 'unknown').replace(/^\//, '');
}

function dayKey(date = new Date()) {
	return date.toISOString().slice(0, 10);
}

function dayToTimestamp(day) {
	return Number.isNaN(Date.parse(`${day}T00:00:00.000Z`)) ? 0 : Date.parse(`${day}T00:00:00.000Z`);
}

module.exports = {
	getBotAnalytics,
	recordCommandDenied,
	recordCommandError,
	recordCommandRun,
	recordGuildJoin,
	recordGuildLeave,
	recordMemberJoin,
	recordMemberLeave
};
