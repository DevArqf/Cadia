const { branding } = require('../../config/branding');

const commandPathAliases = {
	bugreport: 'bug-report',
	'rpg boss-info': 'rpg bestiary'
};

const commandIdAliases = {
	'8ball': 'eightball',
	'top-gg': 'topggvotecheck'
};

const runtimeCommandIds = new Map();

function commandMention(commandPath) {
	const normalizedPath = normalizeCommandPath(commandPath);
	if (!normalizedPath) return '';
	const canonicalPath = commandPathAliases[normalizedPath] || normalizedPath;

	const commandName = canonicalPath.split(/\s+/)[0];
	const commandId = commandIdFor(commandName);

	return commandId ? `</${canonicalPath}:${commandId}>` : `/${canonicalPath}`;
}

function commandIdFor(commandName) {
	const normalizedName = String(commandName || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
	if (runtimeCommandIds.has(normalizedName)) return runtimeCommandIds.get(normalizedName);

	const idName = commandIdAliases[normalizedName] || normalizedName;
	const key = `${idName.replace(/[^a-z0-9]/gi, '').toLowerCase()}commandid`;
	const brandingKey = Object.keys(branding).find((candidate) => candidate.toLowerCase() === key);
	return brandingKey ? branding[brandingKey] : null;
}

async function refreshCommandMentionIds(client, logger = client?.logger) {
	try {
		const commands = await client.application.commands.fetch();
		setRuntimeCommandIds(commands);
		logger?.info?.(`Loaded ${runtimeCommandIds.size} live Discord command IDs for clickable command mentions.`);
		return runtimeCommandIds.size;
	} catch (error) {
		logger?.warn?.(`Could not load live Discord command IDs; falling back to configured IDs: ${error.message}`);
		return 0;
	}
}

function setRuntimeCommandIds(commands) {
	runtimeCommandIds.clear();
	for (const command of commandValues(commands)) {
		if (!command?.name || !command?.id) continue;
		runtimeCommandIds.set(command.name, command.id);
	}
	return runtimeCommandIds.size;
}

function clearRuntimeCommandIds() {
	runtimeCommandIds.clear();
}

function commandValues(commands) {
	if (!commands) return [];
	if (typeof commands.values === 'function') return commands.values();
	if (Array.isArray(commands)) return commands;
	return Object.values(commands);
}

function normalizeCommandPath(commandPath) {
	return String(commandPath || '')
		.trim()
		.replace(/^\/+/, '')
		.replace(/\s+/g, ' ');
}

module.exports = {
	clearRuntimeCommandIds,
	commandIdFor,
	commandMention,
	refreshCommandMentionIds,
	setRuntimeCommandIds
};
