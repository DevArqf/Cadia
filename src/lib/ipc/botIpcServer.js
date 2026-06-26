const { DEFAULT_IPC_ENDPOINT, createIpcServer } = require('@cadia/ipc');

function startBotIpcServer(client, { endpoint = process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT } = {}) {
	const server = createIpcServer({
		endpoint,
		logger: client.logger,
		handler: async (request) => {
			if (request.type === 'bot.status') return botStatus(client);

			const error = new Error(`Unsupported IPC request: ${request.type}`);
			error.code = 'IPC_UNSUPPORTED_REQUEST';
			throw error;
		}
	});

	client.logger.info(`Cadia IPC server listening on ${server.endpoint}`);
	return server;
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

module.exports = {
	botStatus,
	startBotIpcServer
};
