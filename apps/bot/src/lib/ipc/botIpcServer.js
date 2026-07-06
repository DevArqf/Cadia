const { DEFAULT_IPC_ENDPOINT, createIpcServer } = require('@cadia/ipc');
const os = require('node:os');
const { ActivityType, PermissionFlagsBits } = require('discord.js');
const { version } = require('../../../package.json');
const { createInviteUrl } = require('../../config/invite');
const SuggestionConfig = require('../schemas/suggestionConfigSchema');
const { normalizeSuggestionAppearance } = require('../suggestions/appearance');
const { buildSuggestionPanel } = require('../suggestions/suggestionSystem');
const { buildCommandCatalog, getGuildCommandConfig, isModuleEnabled, saveGuildCommandConfig } = require('../runtime/guildCommandConfig');
const { getAutoModConfig, saveAutoModConfig, serializeAutoModConfig, setAutoModModuleEnabled } = require('../automod/autoModService');
const { getGuildSettings, normalizeGuildPrefix, normalizeUpdateChannelId, saveGuildSettings } = require('../runtime/guildSettings');
const { sendAdminUpdate } = require('../admin/updateBroadcast');
const runtimeConfig = require('../runtime/runtimeConfig');
const Blacklist = require('../schemas/blacklistSchema');
const AdminAudit = require('../schemas/adminAuditSchema');
const { cacheGuildBlacklist, removeGuildBlacklistFromCache } = require('../policies/blacklist');

function startBotIpcServer(client, { endpoint = process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT } = {}) {
	const server = createIpcServer({
		endpoint,
		logger: client.logger,
		handler: async (request) => {
			if (request.type === 'bot.status') return botStatus(client);
			if (request.type === 'bot.inviteUrl') return { url: createInviteUrl(client) };
			if (request.type === 'bot.guilds') return botGuilds(client);
			if (request.type === 'admin.overview') return adminOverview(client);
			if (request.type === 'admin.status.update') return updateAdminStatus(client, request.payload);
			if (request.type === 'admin.activity.update') return updateAdminActivity(client, request.payload);
			if (request.type === 'admin.blacklist.add') return addAdminBlacklist(client, request.payload);
			if (request.type === 'admin.blacklist.remove') return removeAdminBlacklist(client, request.payload);
			if (request.type === 'admin.update.send') return sendAdminGuildUpdate(client, request.payload);
			if (request.type === 'guild.settings.get') return getGuildDashboardSettings(client, request.payload);
			if (request.type === 'guild.settings.update') return updateGuildDashboardSettings(client, request.payload);
			if (request.type === 'suggestions.config.get') return getSuggestionConfig(client, request.payload);
			if (request.type === 'suggestions.config.update') return updateSuggestionConfig(client, request.payload);
			if (request.type === 'commands.config.get') return getCommandConfig(client, request.payload);
			if (request.type === 'commands.config.update') return updateCommandConfig(client, request.payload);
			if (request.type === 'automod.config.get') return getAutoModDashboardConfig(client, request.payload);
			if (request.type === 'automod.config.update') return updateAutoModDashboardConfig(client, request.payload);

			const error = new Error(`Unsupported IPC request: ${request.type}`);
			error.code = 'IPC_UNSUPPORTED_REQUEST';
			throw error;
		}
	});

	client.logger.info(`Cadia IPC server listening on ${server.endpoint}`);
	return server;
}

async function adminOverview(client) {
	const [guilds, blacklisted, audit, maintenance, configuredStatus] = await Promise.all([
		botGuilds(client),
		Blacklist.find(),
		AdminAudit.find().sort({ createdAt: -1 }).limit(50),
		runtimeConfig.getRuntimeConfig('maintenance.enabled', false),
		runtimeConfig.getRuntimeConfig('admin.status', null)
	]);
	const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
	const uptimeSeconds = Math.floor(process.uptime());
	const cpuMicros = Object.values(process.cpuUsage()).reduce((total, value) => total + value, 0);
	const cpuPercent = uptimeSeconds > 0 ? Math.min(100, cpuMicros / (uptimeSeconds * 1_000_000 * Math.max(1, os.cpus().length)) * 100) : 0;
	const activeBlacklisted = [];
	for (const entry of blacklisted) {
		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			await Blacklist.findOneAndDelete({ guildId: entry.guildId });
			removeGuildBlacklistFromCache(entry.guildId);
		} else {
			activeBlacklisted.push(entry);
		}
	}
	return {
		guilds,
		blacklisted: activeBlacklisted.map(serializeBlacklist),
		audit: audit.map((entry) => ({
			id: String(entry.__db_id || `${entry.createdAt}-${entry.actorId}`),
			action: entry.action,
			details: entry.details,
			actorId: entry.actorId,
			actorName: entry.actorName,
			createdAt: entry.createdAt
		})),
		status: configuredStatus || (maintenance ? 'maintenance' : 'online'),
		activity: client.user?.presence?.activities?.[0]?.name || '',
		system: {
			version,
			latencyMs: Math.max(0, Math.round(client.ws.ping || 0)),
			memoryMb,
			cpuPercent: Number(cpuPercent.toFixed(1)),
			uptimeMs: process.uptime() * 1000
		}
	};
}

async function updateAdminStatus(client, payload = {}) {
	const status = ['online', 'maintenance', 'offline'].includes(payload.status) ? payload.status : null;
	if (!status) throw new RangeError('Invalid bot status.');
	await runtimeConfig.setRuntimeConfig('maintenance.enabled', status !== 'online', payload.actorId || null);
	await runtimeConfig.setRuntimeConfig('admin.status', status, payload.actorId || null);
	client.user.setPresence({ status: status === 'offline' ? 'invisible' : status === 'maintenance' ? 'idle' : 'online' });
	await writeAdminAudit('Updated bot status', `Status changed to ${status}`, payload);
	return { status };
}

async function updateAdminActivity(client, payload = {}) {
	const activity = String(payload.activity || '').trim().slice(0, 128);
	if (!activity) throw new RangeError('Activity is required.');
	client.disableActivityRotation = true;
	if (client.activityRotationTimer) clearInterval(client.activityRotationTimer);
	client.user.setActivity(activity, { type: ActivityType.Playing });
	await writeAdminAudit('Updated bot activity', `Activity changed to ${activity}`, payload);
	return { activity };
}

async function addAdminBlacklist(client, payload = {}) {
	const guildId = String(payload.guildId || '');
	if (!/^\d{17,20}$/.test(guildId)) throw new RangeError('Invalid Discord server ID.');
	if (await Blacklist.findOne({ guildId })) throw new Error('This server is already blacklisted.');
	const guild = client.guilds.cache.get(guildId);
	const durationMs = Number(payload.durationMs) > 0 ? Number(payload.durationMs) : null;
	const entry = await Blacklist.create({
		guildId,
		guildName: guild?.name || 'Unknown server',
		reason: String(payload.reason || 'No reason provided').slice(0, 500),
		blacklistedAt: Date.now(),
		expiresAt: durationMs ? Date.now() + durationMs : null,
		blacklistedBy: payload.actorId || null
	});
	cacheGuildBlacklist(entry);
	await writeAdminAudit('Blacklisted server', `${entry.guildName} (${guildId}): ${entry.reason}`, payload);
	return serializeBlacklist(entry);
}

async function removeAdminBlacklist(client, payload = {}) {
	const guildId = String(payload.guildId || '');
	const entry = await Blacklist.findOneAndDelete({ guildId });
	if (!entry) throw new Error('This server is not blacklisted.');
	removeGuildBlacklistFromCache(guildId);
	await writeAdminAudit('Removed server blacklist', `${entry.guildName || guildId} (${guildId})`, payload);
	return { guildId };
}

async function sendAdminGuildUpdate(client, payload = {}) {
	const report = await sendAdminUpdate(client, payload, getGuildSettings);
	await writeAdminAudit(
		'Sent server update',
		`${report.target === 'global' ? 'Global broadcast' : `Server ${payload.guildId}`}: ${report.sent} sent, ${report.skipped} skipped, ${report.failed} failed`,
		payload
	);
	return report;
}

function serializeBlacklist(entry) {
	return {
		guildId: entry.guildId,
		guildName: entry.guildName || 'Unknown server',
		reason: entry.reason || 'No reason provided',
		blacklistedAt: Number(entry.blacklistedAt || 0),
		expiresAt: entry.expiresAt ? Number(entry.expiresAt) : null,
		blacklistedBy: entry.blacklistedBy || null
	};
}

async function writeAdminAudit(action, details, payload) {
	return AdminAudit.create({
		action,
		details,
		actorId: String(payload.actorId || 'unknown'),
		actorName: String(payload.actorName || 'unknown'),
		createdAt: Date.now()
	});
}

async function getGuildDashboardSettings(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const settings = await getGuildSettings(guild.id);
	return serializeGuildDashboardSettings(client, guild, settings);
}

async function updateGuildDashboardSettings(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const prefix = normalizeGuildPrefix(payload.prefix);
	const nickname = normalizeBotNickname(payload.nickname);
	const updateChannelId = normalizeUpdateChannelId(payload.updateChannelId);
	if (updateChannelId) {
		const channel = guild.channels.cache.get(updateChannelId) || (await guild.channels.fetch(updateChannelId).catch(() => null));
		if (!channel?.isTextBased?.() || channel.isThread?.()) throw new RangeError('The update channel must be a server text channel.');
	}
	const member = guild.members.me || (await guild.members.fetchMe());
	const targetNickname = nickname === client.user?.username ? null : nickname;

	if ((member.nickname || null) !== targetNickname) {
		try {
			await member.setNickname(targetNickname, `Cadia dashboard update by ${payload.actorId || 'unknown user'}`);
		} catch (error) {
			const failure = new Error(`Could not change Cadia's nickname: ${error.message}`);
			failure.code = 'BOT_NICKNAME_UPDATE_FAILED';
			throw failure;
		}
	}

	const settings = await saveGuildSettings(guild.id, { prefix, updateChannelId }, payload.actorId || null);
	return serializeGuildDashboardSettings(client, guild, settings);
}

function normalizeBotNickname(value) {
	if (typeof value !== 'string') throw new TypeError('Bot nickname must be text.');
	const nickname = value.trim();
	if (nickname.length > 32) throw new RangeError('Bot nickname cannot exceed 32 characters.');
	if (/[\r\n\t]/.test(value)) throw new RangeError('Bot nickname cannot contain line breaks or tabs.');
	return nickname || null;
}

function serializeGuildDashboardSettings(client, guild, settings) {
	return {
		guildId: guild.id,
		prefix: settings.prefix,
		updateChannelId: settings.updateChannelId,
		nickname: guild.members.me?.nickname || client.user?.username || 'Cadia'
	};
}

async function getCommandConfig(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const config = await getGuildCommandConfig(guild.id);
	return { guildId: guild.id, modules: buildCommandCatalog(client, config) };
}

async function updateCommandConfig(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const current = await getGuildCommandConfig(guild.id);
	const catalog = buildCommandCatalog(client, current);
	const inputModules = Array.isArray(payload.modules) ? payload.modules : [];
	const input = {
		modules: Object.fromEntries(
			inputModules.map((module) => [
				module.id,
				{
					enabled: module.enabled !== false,
					response: module.response,
					cooldown: module.cooldown,
					allowedRoleIds: module.allowedRoleIds,
					restrictedRoleIds: module.restrictedRoleIds
				}
			])
		),
		commands: Object.fromEntries(
			inputModules.flatMap((module) =>
				(module.commands || []).map((command) => [
					command.name,
					{
						enabled: command.enabled !== false,
						response: command.response,
						cooldown: command.cooldown,
						allowedRoleIds: command.allowedRoleIds,
						allowedChannelIds: command.allowedChannelIds,
						ignoredChannelIds: command.ignoredChannelIds,
						ignoredRoleIds: command.ignoredRoleIds
					}
				])
			)
		)
	};
	const config = await saveGuildCommandConfig(guild.id, input, payload.actorId || null, catalog);
	const wasAutoModEnabled = isModuleEnabled(current, 'automod');
	const isAutoModEnabled = isModuleEnabled(config, 'automod');
	if (wasAutoModEnabled !== isAutoModEnabled) await setAutoModModuleEnabled(guild, isAutoModEnabled);
	return { guildId: guild.id, modules: buildCommandCatalog(client, config) };
}

async function getAutoModDashboardConfig(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	return serializeAutoModConfig(await getAutoModConfig(guild.id));
}

async function updateAutoModDashboardConfig(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const commandConfig = await getGuildCommandConfig(guild.id);
	const moduleEnabled = isModuleEnabled(commandConfig, 'automod');
	const config = await saveAutoModConfig(guild, payload.config || {}, payload.actorId || null, {
		effectiveEnabled: moduleEnabled && payload.config?.enabled === true
	});
	return serializeAutoModConfig(config);
}

async function getSuggestionConfig(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const config = await SuggestionConfig.findOne({ guildId: guild.id });
	return serializeSuggestionConfig(config, guild.id);
}

async function updateSuggestionConfig(client, payload = {}) {
	const guild = requireGuild(client, payload.guildId);
	const input = payload.config && typeof payload.config === 'object' ? payload.config : {};
	const appearance = normalizeSuggestionAppearance(input);
	let config = await SuggestionConfig.findOne({ guildId: guild.id });
	if (!config) config = new SuggestionConfig({ guildId: guild.id, enabled: false });

	const previous = { channelId: config.channelId, panelMessageId: config.panelMessageId };
	const enabled = input.enabled !== false;
	const channelId = String(input.channelId || config.channelId || '').trim();
	Object.assign(config, appearance, { enabled, channelId: channelId || null, updatedAt: Date.now() });

	if (!enabled) {
		config.panelMessageId = null;
		await config.save();
		await deleteSuggestionPanel(guild, previous);
		return serializeSuggestionConfig(config, guild.id);
	}

	const channel = await resolveSuggestionChannel(guild, channelId);
	assertSuggestionChannelPermissions(guild, channel);
	let panelMessage = null;
	let createdPanel = false;

	if (previous.channelId === channel.id && previous.panelMessageId) {
		panelMessage = await channel.messages.fetch(previous.panelMessageId).catch(() => null);
	}
	if (panelMessage) {
		await panelMessage.edit(buildPanelEditPayload(config));
	} else {
		panelMessage = await channel.send(buildSuggestionPanel(config));
		createdPanel = true;
	}

	config.channelId = channel.id;
	config.panelMessageId = panelMessage.id;
	try {
		await config.save();
	} catch (error) {
		if (createdPanel) await panelMessage.delete().catch(() => null);
		throw error;
	}
	if (previous.panelMessageId && previous.panelMessageId !== panelMessage.id) await deleteSuggestionPanel(guild, previous);
	return serializeSuggestionConfig(config, guild.id);
}

function serializeSuggestionConfig(config, guildId) {
	const appearance = normalizeSuggestionAppearance(config || {});
	return {
		guildId,
		channelId: config?.channelId || null,
		panelMessageId: config?.panelMessageId || null,
		enabled: Boolean(config?.enabled && config?.channelId),
		...appearance
	};
}

function requireGuild(client, guildId) {
	const id = String(guildId || '').trim();
	const guild = client.guilds.cache.get(id);
	if (guild) return guild;
	const error = new Error('Cadia is not in that server.');
	error.code = 'GUILD_NOT_FOUND';
	throw error;
}

async function resolveSuggestionChannel(guild, channelId) {
	if (!channelId) {
		const error = new Error('Choose a text channel for the suggestion panel.');
		error.code = 'SUGGESTION_CHANNEL_REQUIRED';
		throw error;
	}
	const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
	if (!channel?.isTextBased?.() || channel.isThread?.()) {
		const error = new Error('The suggestion channel must be a server text channel.');
		error.code = 'SUGGESTION_CHANNEL_INVALID';
		throw error;
	}
	return channel;
}

function assertSuggestionChannelPermissions(guild, channel) {
	const permissions = channel.permissionsFor(guild.members.me);
	const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks];
	if (permissions?.has(required)) return;
	const error = new Error('Cadia needs View Channel, Send Messages, and Embed Links in the suggestion channel.');
	error.code = 'SUGGESTION_CHANNEL_PERMISSIONS';
	throw error;
}

async function deleteSuggestionPanel(guild, config) {
	if (!config?.channelId || !config?.panelMessageId) return;
	const channel = guild.channels.cache.get(config.channelId) || (await guild.channels.fetch(config.channelId).catch(() => null));
	if (!channel?.messages) return;
	const message = await channel.messages.fetch(config.panelMessageId).catch(() => null);
	await message?.delete().catch(() => null);
}

function buildPanelEditPayload(config) {
	const payload = buildSuggestionPanel(config);
	return {
		...payload,
		content: payload.content ?? null,
		embeds: payload.embeds ?? []
	};
}

function botStatus(client) {
	return {
		ready: Boolean(client.isReady?.()),
		uptimeMs: client.uptime || 0,
		guilds: client.guilds.cache.size,
		users: client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0),
		wsPing: client.ws.ping,
		shardIds: client.ws.shards?.map?.((shard) => shard.id) || [],
		checkedAt: new Date().toISOString()
	};
}

async function botGuilds(client) {
	return Promise.all(client.guilds.cache.map(async (guild) => {
		const settings = await getGuildSettings(guild.id).catch(() => ({ prefix: 'cd ' }));
		const channels = guild.channels.cache.map((channel) => ({
			id: channel.id,
			name: channel.name,
			type: channel.isVoiceBased?.() ? 'voice' : channel.type === 4 ? 'category' : 'text'
		}));
		const roles = guild.roles.cache
			.filter((role) => role.id !== guild.id)
			.map((role) => ({
				id: role.id,
				name: role.name,
				color: role.hexColor || '#99aab5',
				position: role.position,
				permissions: role.permissions?.toArray?.() || []
			}));

		return {
			id: guild.id,
			name: guild.name,
			iconUrl: guild.iconURL?.({ size: 128 }) || null,
			bannerUrl: guild.bannerURL?.({ size: 512 }) || null,
			createdAt: guild.createdTimestamp,
			ownerId: guild.ownerId,
			memberCount: guild.memberCount || 0,
			premiumTier: guild.premiumTier || 0,
			premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
			features: guild.features || [],
			joinedAt: guild.members.me?.joinedTimestamp || Date.now(),
			nickname: guild.members.me?.nickname || client.user?.username || 'Cadia',
			prefix: settings.prefix,
			updateChannelId: settings.updateChannelId,
			verificationLevel: String(guild.verificationLevel ?? 'None'),
			explicitContentFilter: String(guild.explicitContentFilter ?? 'Disabled'),
			defaultMessageNotifications: String(guild.defaultMessageNotifications ?? 'OnlyMentions'),
			mfaLevel: guild.mfaLevel || 0,
			vanityURLCode: guild.vanityURLCode || null,
			description: guild.description || null,
			maxBitrate: guild.maximumBitrate || 96_000,
			maxFileSize: guild.maximumFileSize ? Math.round(guild.maximumFileSize / 1024 / 1024) : 25,
			afkChannel: guild.afkChannel?.name || null,
			afkTimeout: guild.afkTimeout || 300,
			systemChannel: guild.systemChannel?.name || null,
			rulesChannel: guild.rulesChannel?.name || null,
			publicUpdatesChannel: guild.publicUpdatesChannel?.name || null,
			channelCount: guild.channels.cache.size,
			textChannelCount: guild.channels.cache.filter((channel) => channel.isTextBased?.()).size,
			voiceChannelCount: guild.channels.cache.filter((channel) => channel.isVoiceBased?.()).size,
			categoryCount: guild.channels.cache.filter((channel) => channel.type === 4).size,
			emojiCount: guild.emojis.cache.size,
			stickerCount: guild.stickers.cache.size,
			roleCount: guild.roles.cache.size,
			channels,
			roles
		};
	}));
}

module.exports = {
	botStatus,
	botGuilds,
	getAutoModDashboardConfig,
	getCommandConfig,
	getGuildDashboardSettings,
	getSuggestionConfig,
	normalizeBotNickname,
	serializeSuggestionConfig,
	startBotIpcServer,
	updateCommandConfig,
	updateGuildDashboardSettings,
	updateAutoModDashboardConfig,
	updateSuggestionConfig
};
