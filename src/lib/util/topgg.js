const axios = require('axios');

const TOPGG_V1_API = 'https://top.gg/api/v1';
const TOPGG_V0_API = 'https://top.gg/api';
const TOPGG_STATS_INTERVAL = 1000 * 60 * 30;
const TOPGG_REQUEST_TIMEOUT = Number(process.env.TOPGG_REQUEST_TIMEOUT) || 15_000;
const TOPGG_NETWORK_RETRY_DELAYS = [1_000, 3_000];

async function postTopggStats(client) {
	const token = getTopggToken();
	if (!token) {
		client.logger?.debug?.('Top.gg stats post skipped: missing TOPGG_TOKEN.');
		return { skipped: true, reason: 'missing-token' };
	}

	const body = getTopggMetrics(client);

	try {
		await retryTransientNetworkRequest(() =>
			axios.patch(`${TOPGG_V1_API}/projects/@me/metrics`, body, {
				headers: getTopggV1Headers(token),
				timeout: TOPGG_REQUEST_TIMEOUT
			})
		);

		client.logger?.info?.(`Posted Cadia stats to Top.gg: ${body.server_count} servers.`);
		return { skipped: false, serverCount: body.server_count, shardCount: body.shard_count ?? null };
	} catch (error) {
		throwTopggError(error, 'Top.gg stats post failed');
	}
}

function startTopggStatsPoster(client) {
	if (client.topggStatsPoster) return client.topggStatsPoster;

	const post = () => {
		if (client.topggStatsPostInFlight) return;
		client.topggStatsPostInFlight = postTopggStats(client)
			.catch((error) => client.logger?.warn?.(error.message))
			.finally(() => {
				client.topggStatsPostInFlight = null;
			});
	};

	post();
	client.topggStatsPoster = setInterval(post, TOPGG_STATS_INTERVAL);
	return client.topggStatsPoster;
}

async function syncTopggCommands(client) {
	const token = getTopggToken();
	if (!token) {
		client.logger?.debug?.('Top.gg command sync skipped: missing TOPGG_TOKEN.');
		return { skipped: true, reason: 'missing-token' };
	}

	try {
		const commands = await client.application.commands.fetch({ withLocalizations: true });
		const body = commands.map(formatApplicationCommand);

		await axios.put(`${TOPGG_V1_API}/projects/@me/commands`, body, {
			headers: getTopggV1Headers(token),
			timeout: TOPGG_REQUEST_TIMEOUT
		});

		client.logger?.info?.(`Synced ${body.length} commands to Top.gg.`);
		return { skipped: false, commandCount: body.length };
	} catch (error) {
		throwTopggError(error, 'Top.gg command sync failed');
	}
}

async function checkTopggVote(userId, client) {
	const token = getTopggToken();
	if (!token) return { ok: false, missingToken: true };

	try {
		const response = await axios.get(`${TOPGG_V1_API}/projects/@me/votes/${userId}`, {
			headers: getTopggV1Headers(token),
			params: { source: 'discord' },
			timeout: TOPGG_REQUEST_TIMEOUT
		});

		const expiresAt = response.data?.expires_at ? new Date(response.data.expires_at) : null;
		return {
			ok: true,
			voted: !expiresAt || expiresAt.getTime() > Date.now(),
			createdAt: response.data?.created_at ?? null,
			expiresAt: response.data?.expires_at ?? null,
			weight: response.data?.weight ?? 1,
			source: 'v1'
		};
	} catch (error) {
		if (error.response?.status === 404) return { ok: true, voted: false, source: 'v1' };

		const fallback = await checkTopggVoteV0(userId, client).catch((fallbackError) => ({
			ok: false,
			error: fallbackError.message
		}));
		if (fallback.ok) return fallback;

		return { ok: false, error: formatTopggError(error, 'Top.gg vote check failed') };
	}
}

async function checkTopggVoteV0(userId, client) {
	const token = getTopggToken();
	const botId = client?.user?.id || process.env.CLIENT_ID || process.env.BOT_ID;
	if (!token) return { ok: false, missingToken: true };
	if (!botId) return { ok: false, error: 'Missing bot id for Top.gg v0 vote check.' };

	const response = await axios.get(`${TOPGG_V0_API}/bots/${botId}/check`, {
		headers: {
			Authorization: token
		},
		params: { userId },
		timeout: TOPGG_REQUEST_TIMEOUT
	});

	return {
		ok: true,
		voted: response.data?.voted === 1,
		source: 'v0'
	};
}

function getTopggMetrics(client) {
	const serverCount = client.guilds.cache.size;
	const shardCount = client.shard?.count ?? client.options?.shardCount ?? null;

	return cleanObject({
		server_count: serverCount,
		shard_count: typeof shardCount === 'number' ? shardCount : undefined
	});
}

function getTopggToken() {
	return process.env.TOPGG_TOKEN || process.env.TOP_GG_TOKEN || process.env.TOPGG_API_TOKEN;
}

function getTopggV1Headers(token) {
	return {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json'
	};
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

function throwTopggError(error, prefix) {
	throw new Error(formatTopggError(error, prefix));
}

function formatTopggError(error, prefix) {
	const response = error.response;
	if (isTransientNetworkError(error)) return `${prefix}: temporary network/DNS issue (${error.code || error.message})`;
	if (!response) return `${prefix}: ${error.message}`;

	const detail = response.data?.detail || response.data?.message || response.statusText;
	return `${prefix}: ${response.status} ${detail}`;
}

function isTransientNetworkError(error) {
	return ['EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNABORTED'].includes(error?.code);
}

async function retryTransientNetworkRequest(operation, delays = TOPGG_NETWORK_RETRY_DELAYS) {
	for (let attempt = 0; ; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			if (!isTransientNetworkError(error) || attempt >= delays.length) throw error;
			await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
		}
	}
}

module.exports = {
	checkTopggVote,
	getTopggMetrics,
	postTopggStats,
	retryTransientNetworkRequest,
	startTopggStatsPoster,
	syncTopggCommands
};
