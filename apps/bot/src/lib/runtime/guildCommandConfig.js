const GuildCommandConfig = require('../schemas/guildCommandConfigSchema');

const CACHE_MS = 30_000;
const MAX_COOLDOWN_SECONDS = 3_600;
const MAX_POLICY_IDS = 100;
const MAX_RESPONSE_LENGTH = 500;
const cache = new Map();

const MODULES = Object.freeze({
	automod: { name: 'Automod', description: 'Native Discord content, spam, and mention protection.', category: 'Moderation' },
	blacklist: { name: 'Blacklist', description: 'Server and member blacklist administration.', category: 'Moderation' },
	counting: { name: 'Counting', description: 'Counting channels and counting rewards.', category: 'Community' },
	levelling: { name: 'Levelling', description: 'Message XP, ranks, and leaderboards.', category: 'Community' },
	logging: { name: 'Logging', description: 'Server audit and moderation event logging.', category: 'Logging' },
	minigames: { name: 'Minigame', description: 'Interactive games and community challenges.', category: 'Fun' },
	rpg: { name: 'RPG System', description: 'Cadia progression, combat, quests, and inventory.', category: 'RPG' },
	suggestions: { name: 'Suggestions', description: 'Community suggestions and persistent voting.', category: 'Community' },
	tickets: { name: 'Tickets', description: 'Support ticket panels and staff workflows.', category: 'Utility' },
	topgg: { name: 'Top.gg', description: 'Voting and bot-list integrations.', category: 'Utility' },
	welcome: { name: 'Welcoming', description: 'New-member greetings and welcome configuration.', category: 'Community' }
});

async function getGuildCommandConfig(guildId, { fresh = false } = {}) {
	const id = String(guildId || '');
	if (!id) return null;
	const cached = cache.get(id);
	if (!fresh && cached?.expiresAt > Date.now()) return cached.config;
	const config = await GuildCommandConfig.findOne({ guildId: id });
	cache.set(id, { config, expiresAt: Date.now() + CACHE_MS });
	return config;
}

async function saveGuildCommandConfig(guildId, input, updatedBy = null, catalog = null) {
	const normalized = normalizeStoredConfig(input, catalog);
	const config = await GuildCommandConfig.findOneAndUpdate(
		{ guildId },
		{ guildId, ...normalized, updatedAt: Date.now(), updatedBy },
		{ upsert: true }
	);
	cache.set(guildId, { config, expiresAt: Date.now() + CACHE_MS });
	return config;
}

function buildCommandCatalog(client, config = null) {
	const commandStore = client.stores?.get?.('commands');
	const commands = commandStore ? [...commandStore.values()] : [];
	const moduleMap = new Map();

	for (const command of commands) {
		if (!command.supportsChatInputCommands?.() && !command.supportsMessageCommands?.() && !command.supportsContextMenuCommands?.()) continue;
		if (isDeveloperCommand(command)) continue;
		const moduleId = resolveModuleId(command);
		if (!moduleId) continue;
		const definition = MODULES[moduleId];
		if (!moduleMap.has(moduleId)) {
			const policy = getModulePolicy(config, moduleId);
			moduleMap.set(moduleId, {
				id: moduleId,
				name: definition.name,
				description: definition.description,
				category: definition.category,
				...policy,
				commands: []
			});
		}
		const policy = getCommandPolicy(config, command.name);
		moduleMap.get(moduleId).commands.push({
			id: command.name,
			name: command.name,
			description: command.description || 'Cadia command',
			type: command.supportsChatInputCommands?.() ? 'Slash' : command.supportsContextMenuCommands?.() ? 'Context' : 'Command',
			...policy
		});
	}

	return [...moduleMap.values()]
		.map((module) => ({ ...module, commands: module.commands.sort((left, right) => left.name.localeCompare(right.name)) }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeStoredConfig(input = {}, catalog = null) {
	const moduleIds = new Set((catalog || []).map((module) => module.id));
	const commandIds = new Set((catalog || []).flatMap((module) => module.commands.map((command) => command.name)));
	const modules = {};
	const commands = {};

	for (const [moduleId, value] of Object.entries(input.modules || {})) {
		if (!moduleIds.size || moduleIds.has(moduleId)) modules[moduleId] = normalizeModulePolicy(value);
	}
	for (const [commandName, value] of Object.entries(input.commands || {})) {
		if (commandIds.size && !commandIds.has(commandName)) continue;
		commands[commandName] = normalizeCommandPolicy(value);
	}
	return { modules, commands };
}

function resolveModuleId(command) {
	const category = String(command.category || command.fullCategory?.[0] || '').toLowerCase();
	const subcategory = String(command.subCategory || command.fullCategory?.[1] || '').toLowerCase();
	if (category !== 'systems') return null;
	if (subcategory.includes('automod')) return 'automod';
	if (subcategory.includes('blacklist')) return 'blacklist';
	if (subcategory.includes('counting')) return 'counting';
	if (subcategory.includes('levelling')) return 'levelling';
	if (subcategory.includes('logging')) return 'logging';
	if (subcategory.includes('minigame')) return 'minigames';
	if (subcategory.includes('rpg')) return 'rpg';
	if (subcategory.includes('suggestion')) return 'suggestions';
	if (subcategory.includes('ticket')) return 'tickets';
	if (subcategory.includes('top.gg')) return 'topgg';
	if (subcategory.includes('welcoming')) return 'welcome';
	return null;
}

function isCommandEnabled(config, command) {
	if (!config) return true;
	const moduleId = resolveModuleId(command);
	if (!moduleId) return true;
	if (!getModulePolicy(config, moduleId).enabled) return false;
	return getCommandPolicy(config, command.name).enabled;
}

function isModuleEnabled(config, moduleId) {
	return getModulePolicy(config, moduleId).enabled;
}

function getModulePolicy(config, moduleId) {
	return normalizeModulePolicy(config?.modules?.[moduleId]);
}

function getCommandPolicy(config, commandName) {
	return normalizeCommandPolicy(config?.commands?.[commandName]);
}

function normalizeModulePolicy(value) {
	const input = value && typeof value === 'object' ? value : {};
	return {
		enabled: typeof value === 'boolean' ? value : input.enabled !== false,
		response: normalizeResponse(input.response),
		cooldown: normalizeCooldown(input.cooldown),
		allowedRoleIds: normalizeIds(input.allowedRoleIds),
		restrictedRoleIds: normalizeIds(input.restrictedRoleIds)
	};
}

function normalizeCommandPolicy(value) {
	const input = value && typeof value === 'object' ? value : {};
	return {
		enabled: typeof value === 'boolean' ? value : input.enabled !== false,
		response: normalizeResponse(input.response),
		cooldown: normalizeCooldown(input.cooldown),
		allowedRoleIds: normalizeIds(input.allowedRoleIds),
		allowedChannelIds: normalizeIds(input.allowedChannelIds),
		ignoredChannelIds: normalizeIds(input.ignoredChannelIds),
		ignoredRoleIds: normalizeIds(input.ignoredRoleIds)
	};
}

function normalizeCooldown(value) {
	const seconds = Number.parseInt(value, 10);
	if (!Number.isFinite(seconds)) return 0;
	return Math.min(Math.max(seconds, 0), MAX_COOLDOWN_SECONDS);
}

function normalizeIds(value) {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.map(String).filter((id) => /^\d{17,20}$/.test(id)))].slice(0, MAX_POLICY_IDS);
}

function normalizeResponse(value) {
	return typeof value === 'string' ? value.trim().slice(0, MAX_RESPONSE_LENGTH) : '';
}

function isDeveloperCommand(command) {
	const categories = [command?.category, command?.subCategory, ...(command?.fullCategory || [])]
		.map((value) => String(value || '').toLowerCase());
	return categories.includes('developer');
}

function clearGuildCommandConfigCache() {
	cache.clear();
}

module.exports = {
	MODULES,
	buildCommandCatalog,
	clearGuildCommandConfigCache,
	getGuildCommandConfig,
	getCommandPolicy,
	getModulePolicy,
	isCommandEnabled,
	isDeveloperCommand,
	isModuleEnabled,
	normalizeCommandPolicy,
	normalizeModulePolicy,
	normalizeStoredConfig,
	resolveModuleId,
	saveGuildCommandConfig
};
