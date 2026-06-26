const { DEFAULT_IPC_ENDPOINT, createIpcServer } = require('@cadia/ipc');
const { createInviteUrl } = require('../../config/invite');

function startBotIpcServer(client, { endpoint = process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT } = {}) {
	const server = createIpcServer({
		endpoint,
		logger: client.logger,
		handler: async (request) => {
			if (request.type === 'bot.status') return botStatus(client);
			if (request.type === 'bot.inviteUrl') return { url: createInviteUrl(client) };
			if (request.type === 'bot.guilds') return botGuilds(client);

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
	startBotIpcServer
};
