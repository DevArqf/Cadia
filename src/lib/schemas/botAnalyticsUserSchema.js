const { createModel } = require('../database/model');

const BotAnalyticsUserSchema = createModel('BotAnalyticsUserSchema', {
	userId: null,
	firstSeenAt: () => Date.now(),
	lastSeenAt: () => Date.now(),
	commandRuns: 0,
	guildIds: () => ({})
});

module.exports = {
	BotAnalyticsUserSchema
};
