const {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder
} = require('discord.js');
const { color, emojis } = require('../../config');
const { AuditLogConfigSchema } = require('../schemas/auditLogConfigSchema');
const { getGuildCommandConfig, isModuleEnabled } = require('../runtime/guildCommandConfig');
const AUDIT_CONFIG_CACHE_MS = 60_000;
const AUDIT_EVENT_DEDUP_MS = 5_000;
const AUDIT_EVENT_CACHE_LIMIT = 2_000;
const auditConfigCache = new Map();
const recentAuditEvents = new Map();

const auditCategories = {
	messages: { label: 'Messages', description: 'Message edits, deletes, and bulk deletes.' },
	members: { label: 'Members', description: 'Member joins, leaves, and profile changes.' },
	moderation: { label: 'Moderation', description: 'Bans and unbans.' },
	channels: { label: 'Channels', description: 'Channel creates, updates, and deletes.' },
	forums: { label: 'Forums', description: 'Forum channel creates, updates, and deletes.' },
	threads: { label: 'Threads', description: 'Thread creates, updates, and deletes.' },
	roles: { label: 'Roles', description: 'Role creates, updates, and deletes.' },
	voice: { label: 'Voice', description: 'Voice joins, leaves, moves, mute/deafen changes.' },
	invites: { label: 'Invites', description: 'Invite creates and deletes.' },
	emojis: { label: 'Emojis', description: 'Emoji creates, updates, and deletes.' },
	stickers: { label: 'Stickers', description: 'Sticker creates, updates, and deletes.' },
	commands: { label: 'Commands', description: 'Slash command usage.' },
	server: { label: 'Server', description: 'Server name, icon, and boost setting changes.' }
};

const auditActions = {
	messageUpdate: { category: 'messages', label: 'Message Edits', description: 'Edited message content.' },
	messageDelete: { category: 'messages', label: 'Message Deletes', description: 'Single deleted messages.' },
	messageDeleteBulk: { category: 'messages', label: 'Bulk Deletes', description: 'Bulk message removals.' },
	memberAdd: { category: 'members', label: 'Member Joins', description: 'New members joining.' },
	memberRemove: { category: 'members', label: 'Member Leaves', description: 'Members leaving.' },
	memberUpdate: { category: 'members', label: 'Member Updates', description: 'Nickname and role changes.' },
	banAdd: { category: 'moderation', label: 'Bans', description: 'Members being banned.' },
	banRemove: { category: 'moderation', label: 'Unbans', description: 'Members being unbanned.' },
	channelCreate: { category: 'channels', label: 'Channel Creates', description: 'New channels created.' },
	channelUpdate: { category: 'channels', label: 'Channel Updates', description: 'Channel setting changes.' },
	channelDelete: { category: 'channels', label: 'Channel Deletes', description: 'Channels removed.' },
	forumCreate: { category: 'forums', label: 'Forum Creates', description: 'New forum channels created.' },
	forumUpdate: { category: 'forums', label: 'Forum Updates', description: 'Forum channel setting changes.' },
	forumDelete: { category: 'forums', label: 'Forum Deletes', description: 'Forum channels removed.' },
	threadCreate: { category: 'threads', label: 'Thread Creates', description: 'New threads created.' },
	threadUpdate: { category: 'threads', label: 'Thread Updates', description: 'Thread setting changes.' },
	threadDelete: { category: 'threads', label: 'Thread Deletes', description: 'Threads removed.' },
	roleCreate: { category: 'roles', label: 'Role Creates', description: 'New roles created.' },
	roleUpdate: { category: 'roles', label: 'Role Updates', description: 'Role setting changes.' },
	roleDelete: { category: 'roles', label: 'Role Deletes', description: 'Roles removed.' },
	voiceJoin: { category: 'voice', label: 'Voice Joins', description: 'Members joining voice.' },
	voiceLeave: { category: 'voice', label: 'Voice Leaves', description: 'Members leaving voice.' },
	voiceMove: { category: 'voice', label: 'Voice Moves', description: 'Members moving channels.' },
	voiceUpdate: { category: 'voice', label: 'Voice Updates', description: 'Mute, deaf, and stream changes.' },
	inviteCreate: { category: 'invites', label: 'Invite Creates', description: 'New invites created.' },
	inviteDelete: { category: 'invites', label: 'Invite Deletes', description: 'Invites removed.' },
	emojiCreate: { category: 'emojis', label: 'Emoji Creates', description: 'New emojis added.' },
	emojiUpdate: { category: 'emojis', label: 'Emoji Updates', description: 'Emoji changes.' },
	emojiDelete: { category: 'emojis', label: 'Emoji Deletes', description: 'Emojis removed.' },
	stickerCreate: { category: 'stickers', label: 'Sticker Creates', description: 'New stickers added.' },
	stickerUpdate: { category: 'stickers', label: 'Sticker Updates', description: 'Sticker changes.' },
	stickerDelete: { category: 'stickers', label: 'Sticker Deletes', description: 'Stickers removed.' },
	commandUse: { category: 'commands', label: 'Command Uses', description: 'Slash commands used.' },
	guildUpdate: { category: 'server', label: 'Server Updates', description: 'Server setting changes.' }
};

async function getAuditConfig(guildId) {
	const cached = auditConfigCache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.config;

	let config = await AuditLogConfigSchema.findOne({ guildId });
	if (!config) {
		config = await AuditLogConfigSchema.create({ guildId });
	}

	config.events = { ...defaultEvents(), ...(config.events || {}) };
	config.channelIds = normalizeChannelIds(config.channelIds);
	auditConfigCache.set(guildId, { config, expiresAt: Date.now() + AUDIT_CONFIG_CACHE_MS });
	return config;
}

async function updateAuditConfig(guildId, patch) {
	const config = await getAuditConfig(guildId);
	if ('channelId' in patch) config.channelId = patch.channelId;
	if (patch.channelIds) {
		config.channelIds = Object.keys(patch.channelIds).length
			? normalizeChannelIds({ ...normalizeChannelIds(config.channelIds), ...patch.channelIds })
			: {};
	}
	if ('enabled' in patch) config.enabled = patch.enabled;
	if (patch.events) config.events = { ...defaultEvents(), ...(config.events || {}), ...patch.events };
	config.updatedAt = Date.now();
	await config.save();
	auditConfigCache.set(guildId, { config, expiresAt: Date.now() + AUDIT_CONFIG_CACHE_MS });
	return config;
}

async function toggleAuditEvent(guildId, eventKey) {
	if (!auditActions[eventKey]) throw new Error('Unknown audit action.');
	const config = await getAuditConfig(guildId);
	config.events[eventKey] = !config.events[eventKey];
	config.updatedAt = Date.now();
	await config.save();
	auditConfigCache.set(guildId, { config, expiresAt: Date.now() + AUDIT_CONFIG_CACHE_MS });
	return config;
}

async function sendAuditLog(guild, eventKey, title, details = [], options = {}) {
	const action = auditActions[eventKey];
	if (!guild || !action) return;
	if (!claimAuditEvent(guild.id, eventKey, title, details)) return;

	const [config, commandConfig] = await Promise.all([
		getAuditConfig(guild.id).catch(() => null),
		getGuildCommandConfig(guild.id).catch(() => null)
	]);
	if (!config?.enabled || !config.events?.[eventKey] || !isModuleEnabled(commandConfig, 'logging')) return;

	const channelId = resolveAuditChannelId(config, eventKey);
	if (!channelId) return;

	const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
	if (!channel?.isTextBased?.()) return;

	const loggedAt = Math.floor(Date.now() / 1000);
	const thumbnailURL = resolveAuditThumbnail(guild, options);
	const header = new TextDisplayBuilder().setContent(
		`${options.emoji || emojis.custom.info} **${title}**\n-# ${auditCategories[action.category].label} / ${action.label}`
	);
	const container = new ContainerBuilder()
		.setAccentColor(accent(options.color || color.default))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatDetails(details)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.clock} **Logged:** <t:${loggedAt}:F>\n-# <t:${loggedAt}:R>`));

	if (thumbnailURL) {
		container.spliceComponents(
			0,
			0,
			new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailURL))
		);
	} else {
		container.spliceComponents(0, 0, header);
	}

	await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
}

function claimAuditEvent(guildId, eventKey, title, details, now = Date.now()) {
	const fingerprint = JSON.stringify([
		guildId,
		eventKey,
		title,
		details.map((detail) => [detail?.label || '', String(detail?.value ?? '')])
	]);
	const expiresAt = recentAuditEvents.get(fingerprint);
	if (expiresAt && expiresAt > now) return false;
	recentAuditEvents.set(fingerprint, now + AUDIT_EVENT_DEDUP_MS);
	pruneAuditEventCache(now);
	return true;
}

function pruneAuditEventCache(now) {
	if (recentAuditEvents.size <= AUDIT_EVENT_CACHE_LIMIT) return;
	for (const [fingerprint, expiresAt] of recentAuditEvents) {
		if (expiresAt <= now || recentAuditEvents.size > AUDIT_EVENT_CACHE_LIMIT) recentAuditEvents.delete(fingerprint);
		if (recentAuditEvents.size <= AUDIT_EVENT_CACHE_LIMIT) break;
	}
}

function clearAuditEventCache() {
	recentAuditEvents.clear();
}

function defaultEvents() {
	return Object.fromEntries(Object.keys(auditActions).map((key) => [key, true]));
}

function resolveAuditChannelId(config, eventKey) {
	return normalizeChannelIds(config.channelIds)[eventKey] || config.channelId || null;
}

function normalizeChannelIds(channelIds) {
	if (!channelIds || typeof channelIds !== 'object' || Array.isArray(channelIds)) return {};

	return Object.fromEntries(Object.entries(channelIds).filter(([eventKey, channelId]) => auditActions[eventKey] && channelId));
}

function formatDetails(details) {
	const rows = details.filter((detail) => detail && detail.value !== undefined && detail.value !== null && detail.value !== '');
	if (!rows.length) return `${emojis.custom.warning} No extra details were captured.`;
	return rows.map((detail) => `${detail.icon || emojis.custom.arrowright} **${detail.label}:** ${truncate(String(detail.value), 900)}`).join('\n');
}

function truncate(value, maxLength) {
	return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function accent(hex = color.default) {
	return Number.parseInt(String(hex).replace('#', ''), 16);
}

function resolveAuditThumbnail(guild, options) {
	if (options.thumbnailURL) return options.thumbnailURL;
	if (options.user?.displayAvatarURL) return options.user.displayAvatarURL({ extension: 'png', size: 128 });
	if (options.member?.user?.displayAvatarURL) return options.member.user.displayAvatarURL({ extension: 'png', size: 128 });
	return guild.iconURL?.({ extension: 'png', size: 128 }) ?? null;
}

module.exports = {
	auditActions,
	auditCategories,
	claimAuditEvent,
	clearAuditEventCache,
	defaultEvents,
	getAuditConfig,
	resolveAuditChannelId,
	sendAuditLog,
	toggleAuditEvent,
	updateAuditConfig
};
