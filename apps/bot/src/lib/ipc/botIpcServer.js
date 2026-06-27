const { DEFAULT_IPC_ENDPOINT, createIpcServer } = require('@cadia/ipc');
const { PermissionFlagsBits } = require('discord.js');
const { createInviteUrl } = require('../../config/invite');
const SuggestionConfig = require('../schemas/suggestionConfigSchema');
const { normalizeSuggestionAppearance } = require('../suggestions/appearance');
const { buildSuggestionPanel } = require('../suggestions/suggestionSystem');
const { buildCommandCatalog, getGuildCommandConfig, isModuleEnabled, saveGuildCommandConfig } = require('../runtime/guildCommandConfig');
const { getAutoModConfig, saveAutoModConfig, serializeAutoModConfig, setAutoModModuleEnabled } = require('../automod/autoModService');

function startBotIpcServer(client, { endpoint = process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT } = {}) {
	const server = createIpcServer({
		endpoint,
		logger: client.logger,
		handler: async (request) => {
			if (request.type === 'bot.status') return botStatus(client);
			if (request.type === 'bot.inviteUrl') return { url: createInviteUrl(client) };
			if (request.type === 'bot.guilds') return botGuilds(client);
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

function botGuilds(client) {
	return client.guilds.cache.map((guild) => {
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
			ownerId: guild.ownerId,
			memberCount: guild.memberCount || 0,
			premiumTier: guild.premiumTier || 0,
			premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
			features: guild.features || [],
			joinedAt: guild.members.me?.joinedTimestamp || Date.now(),
			nickname: guild.members.me?.nickname || client.user?.username || 'Cadia',
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
	});
}

module.exports = {
	botStatus,
	botGuilds,
	getAutoModDashboardConfig,
	getCommandConfig,
	getSuggestionConfig,
	serializeSuggestionConfig,
	startBotIpcServer,
	updateCommandConfig,
	updateAutoModDashboardConfig,
	updateSuggestionConfig
};
