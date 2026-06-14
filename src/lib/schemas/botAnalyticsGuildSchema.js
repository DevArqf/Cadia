const { createModel } = require('../database/model');

const BotAnalyticsGuildSchema = createModel('BotAnalyticsGuildSchema', {
	guildId: null,
	name: null,
	joinedAt: () => Date.now(),
	leftAt: null,
	lastSeenAt: () => Date.now(),
	memberCount: 0,
	commandRuns: 0
});

module.exports = {
	BotAnalyticsGuildSchema
};
