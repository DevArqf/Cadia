const { AttachmentBuilder, MessageFlags } = require('discord.js');
const { channels } = require('../../config');
const { buildAlertPanel } = require('./globalAlerts');
const LevelSchema = require('../schemas/levelSchema');
const { GlobalAlertReceiptSchema } = require('../schemas/globalAlertReceiptSchema');
const { RpgAccessSchema } = require('../schemas/RPG System/rpgAccessSchema');
const { RpgProfileSchema } = require('../schemas/RPG System/rpgProfileSchema');
const { RpgTutorialSchema } = require('../schemas/RPG System/rpgTutorialSchema');
const { TicketSchema } = require('../schemas/ticketSchema');
const { UserSettingsSchema } = require('../schemas/usersettingSchema');

async function sendUserDms(client, alert, targetData = null, options = {}) {
	targetData ??= await collectBroadcastUserIds(client);
	const userIds = targetData.userIds;
	const stats = { sent: 0, failed: 0, total: userIds.size, sources: targetData.sources, deliveries: [] };
	const startedAt = Date.now();
	options.onProgress?.({ ...stats, processed: 0, remaining: stats.total, startedAt });

	for (const userId of userIds) {
		const user = await client.users.fetch(userId).catch(() => null);
		if (!user || user.bot) {
			stats.failed += 1;
			stats.deliveries.push(createDeliveryRecord(userId, user, targetData, 'failed', user?.bot ? 'Bot account' : 'User fetch failed'));
			reportBroadcastProgress(options.onProgress, stats, startedAt);
			continue;
		}

		let failureReason = '';
		const sent = await user.send({ components: [buildAlertPanel(alert)], flags: MessageFlags.IsComponentsV2 }).then(
			() => true,
			(error) => {
				failureReason = error?.message || 'DM delivery failed';
				return false;
			}
		);
		if (sent) stats.sent += 1;
		else stats.failed += 1;
		stats.deliveries.push(createDeliveryRecord(userId, user, targetData, sent ? 'sent' : 'failed', failureReason));
		reportBroadcastProgress(options.onProgress, stats, startedAt);
	}

	return stats;
}

async function sendAlertToChannel(client, alert, channelId = channels.globalAlerts) {
	const channel = client.channels.cache.get(channelId) || (await client.channels.fetch(channelId).catch(() => null));
	if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
		throw new Error(`Global alert channel ${channelId} is unavailable or is not text-based.`);
	}

	return channel.send({
		components: [buildAlertPanel(alert)],
		flags: MessageFlags.IsComponentsV2,
		allowedMentions: { parse: [] }
	});
}

function reportBroadcastProgress(onProgress, stats, startedAt) {
	if (!onProgress) return;
	const processed = stats.sent + stats.failed;
	onProgress({
		failed: stats.failed,
		processed,
		remaining: Math.max(stats.total - processed, 0),
		sent: stats.sent,
		sources: stats.sources,
		total: stats.total,
		startedAt
	});
}

async function collectBroadcastUserIds(client) {
	const userIds = new Set();
	const userGuilds = new Map();
	const sources = {
		cachedUsers: 0,
		cachedMembers: 0,
		fetchedMembers: 0,
		guildOwners: 0,
		database: 0
	};

	for (const user of client.users.cache.values()) {
		if (!user.bot && addBroadcastTarget(userIds, userGuilds, user.id)) sources.cachedUsers += 1;
	}

	for (const guild of client.guilds.cache.values()) {
		if (addBroadcastTarget(userIds, userGuilds, guild.ownerId, guild)) sources.guildOwners += 1;

		for (const member of guild.members.cache.values()) {
			if (!member.user?.bot && addBroadcastTarget(userIds, userGuilds, member.id, guild)) sources.cachedMembers += 1;
		}

		const fetchedMembers = await guild.members.fetch().catch(() => null);
		if (fetchedMembers) {
			for (const member of fetchedMembers.values()) {
				if (!member.user?.bot && addBroadcastTarget(userIds, userGuilds, member.id, guild)) sources.fetchedMembers += 1;
			}
		}
	}

	sources.database = await collectDatabaseUserIds(userIds);

	return { userIds, userGuilds, sources };
}

async function collectDatabaseUserIds(userIds) {
	const documents = (
		await Promise.all([
			safeFindAll(LevelSchema),
			safeFindAll(GlobalAlertReceiptSchema),
			safeFindAll(RpgAccessSchema),
			safeFindAll(RpgProfileSchema),
			safeFindAll(RpgTutorialSchema),
			safeFindAll(TicketSchema),
			safeFindAll(UserSettingsSchema)
		])
	).flat();

	let added = 0;
	for (const document of documents) {
		for (const key of ['userId', 'ownerId', 'claimedById', 'closedById', 'User', 'userID']) {
			if (addUserId(userIds, document?.[key])) added += 1;
		}
		for (const participantId of document?.participants || []) {
			if (addUserId(userIds, participantId)) added += 1;
		}
	}
	return added;
}

async function safeFindAll(model) {
	return model?.find ? model.find({}).catch(() => []) : [];
}

function addUserId(userIds, userId) {
	const value = String(userId || '').trim();
	if (!/^\d{17,20}$/.test(value) || userIds.has(value)) return false;
	userIds.add(value);
	return true;
}

function addBroadcastTarget(userIds, userGuilds, userId, guild = null) {
	const value = String(userId || '').trim();
	if (!/^\d{17,20}$/.test(value)) return false;
	const added = addUserId(userIds, value);
	if (guild) {
		if (!userGuilds.has(value)) userGuilds.set(value, new Map());
		userGuilds.get(value).set(guild.id, guild.name || 'Unknown Server');
	}
	return added;
}

function createDeliveryRecord(userId, user, targetData, status, failureReason = '') {
	const guilds = [...(targetData.userGuilds?.get(userId) || new Map()).entries()];
	return {
		status,
		username: user?.tag || user?.username || user?.globalName || 'Unknown',
		userId,
		serverNames: guilds.length ? guilds.map(([, name]) => name) : ['Unknown / database record'],
		serverIds: guilds.length ? guilds.map(([id]) => id) : [],
		failureReason
	};
}

function createDmReportAttachment(alert, deliveries = []) {
	const headers = ['status', 'username', 'user_id', 'server_names', 'server_ids', 'failure_reason'];
	const rows = deliveries.map((delivery) => [
		delivery.status,
		delivery.username,
		delivery.userId,
		delivery.serverNames.join(' | '),
		delivery.serverIds.join(' | '),
		delivery.failureReason
	]);
	const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
	const safeAlertId = String(alert?.alertId || Date.now()).replace(/[^a-z0-9_-]/gi, '-');
	return new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: `cadia-alert-dm-report-${safeAlertId}.csv` });
}

function csvCell(value) {
	const text = String(value ?? '');
	return `"${text.replace(/"/g, '""')}"`;
}

function formatTargetSources(sources = {}) {
	const entries = [
		['cache users', sources.cachedUsers],
		['cache members', sources.cachedMembers],
		['fetched members', sources.fetchedMembers],
		['guild owners', sources.guildOwners],
		['database', sources.database]
	].filter(([, value]) => value);
	return entries.length ? entries.map(([label, value]) => `${value} ${label}`).join(', ') : 'No target sources found';
}

module.exports = {
	collectBroadcastUserIds,
	createDmReportAttachment,
	formatTargetSources,
	sendAlertToChannel,
	sendUserDms
};
