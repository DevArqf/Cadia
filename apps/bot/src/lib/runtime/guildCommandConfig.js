const GuildCommandConfig = require('../schemas/guildCommandConfigSchema');

const CACHE_MS = 30_000;
const MAX_COOLDOWN_SECONDS = 3_600;
const MAX_POLICY_IDS = 100;
const MAX_RESPONSE_LENGTH = 500;
const cache = new Map();
const IMMUTABLE_COMMANDS = new Set(['vote', 'top-gg']);
const IMMUTABLE_MODULES = new Set(['topgg']);
const DASHBOARD_EXCLUDED_COMMANDS = new Set(['vote', 'top-gg', 'blacklist-add', 'blacklist-list', 'blacklist-remove']);

const MODULES = Object.freeze({
	automod: { name: 'AutoMod', description: 'Stop harmful content, spam, and mention abuse before it disrupts your server.', category: 'Moderation' },
	counting: { name: 'Counting', description: 'Build a shared counting streak with configurable channels and rewards.', category: 'Community' },
	levelling: { name: 'Levelling', description: 'Reward meaningful activity with XP, ranks, and competitive leaderboards.', category: 'Community' },
	logging: { name: 'Logging', description: 'Keep a dependable record of important server and moderation activity.', category: 'Logging' },
	minigames: { name: 'Minigames', description: 'Give members quick, interactive ways to play and compete together.', category: 'Fun' },
	rpg: { name: 'RPG System', description: 'Create long-term progression through combat, quests, equipment, and rewards.', category: 'RPG' },
	suggestions: { name: 'Suggestions', description: 'Collect ideas, measure support, and keep community feedback organized.', category: 'Community' },
	tickets: { name: 'Tickets', description: 'Run private, structured support conversations with clear staff controls.', category: 'Utility' },
	topgg: { name: 'Top.gg', description: 'Voting and bot-list integrations.', category: 'Utility', configurable: false },
	welcome: { name: 'Welcoming', description: 'Give every new member a polished introduction to your community.', category: 'Community' }
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
	return buildDashboardCatalog(client, config).modules;
}

function buildDashboardCatalog(client, config = null) {
	const commandStore = client.stores?.get?.('commands');
	const commands = commandStore ? [...commandStore.values()] : [];
	const moduleMap = new Map();
	const standaloneCommands = [];

	for (const command of commands) {
		if (!command.supportsChatInputCommands?.() && !command.supportsMessageCommands?.() && !command.supportsContextMenuCommands?.()) continue;
		if (isDeveloperCommand(command) || DASHBOARD_EXCLUDED_COMMANDS.has(command.name)) continue;
		const moduleId = resolveModuleId(command);
		const policy = getCommandPolicy(config, command.name);
		const serialized = {
			id: command.name,
			name: command.name,
			description: command.description || 'Cadia command',
			type: command.supportsChatInputCommands?.() ? 'Slash' : command.supportsContextMenuCommands?.() ? 'Context' : 'Command',
			...policy,
			configurable: true,
			enabled: policy.enabled,
			moduleId: moduleId || null,
			moduleName: moduleId ? MODULES[moduleId]?.name || moduleId : null,
			category: normalizeCommandCategory(command)
		};
		if (!moduleId) {
			standaloneCommands.push(serialized);
			continue;
		}
		const definition = MODULES[moduleId];
		if (!definition || moduleId === 'topgg') continue;
		if (!moduleMap.has(moduleId)) {
			const policy = getModulePolicy(config, moduleId);
			moduleMap.set(moduleId, {
				id: moduleId,
				name: definition.name,
				description: definition.description,
				category: definition.category,
				...policy,
				configurable: definition.configurable !== false,
				enabled: IMMUTABLE_MODULES.has(moduleId) ? true : policy.enabled,
				commands: []
			});
		}
		moduleMap.get(moduleId).commands.push(serialized);
	}

	const modules = [...moduleMap.values()]
		.map((module) => ({ ...module, commands: module.commands.sort((left, right) => left.name.localeCompare(right.name)) }))
		.sort((left, right) => left.name.localeCompare(right.name));
	return { modules, commands: standaloneCommands.sort((left, right) => left.name.localeCompare(right.name)) };
}

function normalizeStoredConfig(input = {}, catalog = null) {
	const catalogModules = Array.isArray(catalog) ? catalog : catalog?.modules || [];
	const standaloneCommands = Array.isArray(catalog?.commands) ? catalog.commands : [];
	const moduleIds = new Set(catalogModules.map((module) => module.id));
	const commandIds = new Set([...catalogModules.flatMap((module) => module.commands.map((command) => command.name)), ...standaloneCommands.map((command) => command.name)]);
	const modules = {};
	const commands = {};

	for (const [moduleId, value] of Object.entries(input.modules || {})) {
		if (!moduleIds.size || moduleIds.has(moduleId)) {
			modules[moduleId] = normalizeModulePolicy(value);
			if (IMMUTABLE_MODULES.has(moduleId)) modules[moduleId].enabled = true;
		}
	}
	for (const [commandName, value] of Object.entries(input.commands || {})) {
		if (commandIds.size && !commandIds.has(commandName)) continue;
		commands[commandName] = normalizeCommandPolicy(value);
		if (IMMUTABLE_COMMANDS.has(commandName)) commands[commandName].enabled = true;
	}
	return { modules, commands };
}

function resolveModuleId(command) {
	const category = String(command.category || command.fullCategory?.[0] || '').toLowerCase();
	const subcategory = String(command.subCategory || command.fullCategory?.[1] || '').toLowerCase();
	if (category !== 'systems') return null;
	if (subcategory.includes('automod')) return 'automod';
	// Blacklist is a developer-only enforcement system, not a guild module.
	if (subcategory.includes('blacklist')) return null;
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
	if (IMMUTABLE_COMMANDS.has(command.name)) return true;
	if (isDeveloperCommand(command)) return true;
	if (!config) return true;
	const moduleId = resolveModuleId(command);
	if (!moduleId) return getCommandPolicy(config, command.name).enabled;
	if (!getModulePolicy(config, moduleId).enabled) return false;
	return getCommandPolicy(config, command.name).enabled;
}

function normalizeCommandCategory(command) {
	const value = String(command.category || command.fullCategory?.[0] || 'Utility');
	const allowed = ['Moderation', 'RPG', 'Utility', 'Fun', 'Logging', 'Community'];
	return allowed.find((category) => category.toLowerCase() === value.toLowerCase()) || 'Utility';
}

function isModuleEnabled(config, moduleId) {
	if (IMMUTABLE_MODULES.has(moduleId)) return true;
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
	DASHBOARD_EXCLUDED_COMMANDS,
	IMMUTABLE_COMMANDS,
	IMMUTABLE_MODULES,
	buildCommandCatalog,
	buildDashboardCatalog,
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
