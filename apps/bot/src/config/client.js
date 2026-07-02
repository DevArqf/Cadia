const path = require('node:path');
const { BucketScope, LogLevel } = require('@sapphire/framework');
const { GatewayIntentBits, Partials } = require('discord.js');
const { seconds } = require('../lib/util/common/time');
const { PrivilegedUsers } = require('../lib/util/constants');
const { buildCadiaShardingStrategy } = require('../lib/gateway/CadiaShardingStrategy');
const { getGuildPrefix } = require('../lib/runtime/guildSettings');

const ClientConfig = {
	baseUserDirectory: path.resolve(__dirname, '..'),
	intents: [
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageTyping
	],
	allowedMentions: {
		parse: ['users'],
		repliedUser: false
	},
	caseInsensitiveCommands: true,
	caseInsensitivePrefixes: true,
	defaultPrefix: 'cd ',
	fetchPrefix: getGuildPrefix,
	defaultCooldown: {
		delay: seconds(5),
		filteredUsers: PrivilegedUsers,
		scope: BucketScope.User
	},
	partials: [Partials.GuildMember, Partials.Message, Partials.User, Partials.Channel],
	logger: {
		level: LogLevel.Info
	},
	loadMessageCommandListeners: true,
	typing: false,
	disableMentionPrefix: false,
	preventFailedToFetchLogForGuilds: true,
	ws: {
		buildStrategy: buildCadiaShardingStrategy
	},
	api: {
		port: 4050
	}
};

module.exports = { ClientConfig };
