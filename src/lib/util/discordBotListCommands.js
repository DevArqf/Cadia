const axios = require('axios');

const DISCORD_BOT_LIST_API = 'https://discordbotlist.com/api/v1';

async function syncDiscordBotListCommands(client) {
	const token = getDiscordBotListToken();
	if (!token) {
		client.logger.debug('Discord Bot List command sync skipped: missing DISCORDBOTLIST_TOKEN.');
		return;
	}

	const botId = client.user?.id;
	if (!botId) {
		client.logger.warn('Discord Bot List command sync skipped: client user is unavailable.');
		return;
	}

	try {
		const commands = await client.application.commands.fetch({ withLocalizations: true });
		const body = commands.map(formatApplicationCommand);

		await axios.post(`${DISCORD_BOT_LIST_API}/bots/${botId}/commands`, body, {
			headers: {
				Authorization: `Bot ${token}`,
				'Content-Type': 'application/json'
			}
		});

		client.logger.info(`Synced ${body.length} commands to Discord Bot List.`);
	} catch (error) {
		const response = error.response;
		const status = response ? `${response.status} ${response.statusText}` : error.message;
		client.logger.warn(`Discord Bot List command sync failed: ${status}`);
	}
}

function getDiscordBotListToken() {
	return process.env.DISCORDBOTLIST_TOKEN || process.env.DISCORD_BOT_LIST_TOKEN || process.env.DBL_TOKEN;
}

function formatApplicationCommand(command) {
	const json = command.toJSON();

	return cleanObject({
		name: json.name,
		name_localizations: json.name_localizations,
		description: json.description,
		description_localizations: json.description_localizations,
		type: json.type,
		options: json.options,
		default_member_permissions: json.default_member_permissions,
		dm_permission: json.dm_permission,
		default_permission: json.default_permission,
		nsfw: json.nsfw,
		integration_types: json.integration_types,
		contexts: json.contexts
	});
}

function cleanObject(value) {
	if (Array.isArray(value)) return value.map(cleanObject);

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
				.map(([key, entryValue]) => [key, cleanObject(entryValue)])
		);
	}

	return value;
}

module.exports = {
	syncDiscordBotListCommands
};
