const { branding } = require('../../config/branding');

function commandMention(commandPath) {
	const normalizedPath = normalizeCommandPath(commandPath);
	if (!normalizedPath) return '';

	const commandName = normalizedPath.split(/\s+/)[0];
	const commandId = commandIdFor(commandName);

	return commandId ? `</${normalizedPath}:${commandId}>` : `/${normalizedPath}`;
}

function commandIdFor(commandName) {
	const key = `${String(commandName || '').replace(/[^a-z0-9]/gi, '').toLowerCase()}commandid`;
	const brandingKey = Object.keys(branding).find((candidate) => candidate.toLowerCase() === key);
	return brandingKey ? branding[brandingKey] : null;
}

function normalizeCommandPath(commandPath) {
	return String(commandPath || '')
		.trim()
		.replace(/^\/+/, '')
		.replace(/\s+/g, ' ');
}

module.exports = {
	commandIdFor,
	commandMention
};
