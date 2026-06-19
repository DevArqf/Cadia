const { createModel } = require('../database/model');

const BotAnalyticsDailySchema = createModel('BotAnalyticsDailySchema', {
	day: null,
	commandRuns: 0,
	slashCommandRuns: 0,
	messageCommandRuns: 0,
	commandErrors: 0,
	commandDenied: 0,
	meaningfulCommandRuns: 0,
	newUsers: 0,
	memberJoins: 0,
	memberLeaves: 0,
	guildJoins: 0,
	guildLeaves: 0,
	uniqueCommandUsers: () => ({}),
	commands: () => ({}),
	guilds: () => ({}),
	meaningfulGuilds: () => ({}),
	commandCategories: () => ({}),
	commandErrorsByName: () => ({}),
	commandDeniedByName: () => ({}),
	onboardingDelivered: 0,
	onboardingFailed: 0,
	onboardingVariants: () => ({}),
	growthInstrumentedAt: null,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	BotAnalyticsDailySchema
};
