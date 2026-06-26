const { createModel } = require('../database/model');

const BotAnalyticsGuildSchema = createModel('BotAnalyticsGuildSchema', {
	guildId: null,
	name: null,
	joinedAt: () => Date.now(),
	currentJoinedAt: () => Date.now(),
	cohortTrackedAt: null,
	joinCount: 1,
	leftAt: null,
	lastSeenAt: () => Date.now(),
	firstCommandAt: null,
	firstMeaningfulCommandAt: null,
	activatedAt: null,
	lastActiveAt: null,
	lastActiveDay: null,
	retained7At: null,
	retained30At: null,
	meaningfulCommands: () => ({}),
	activeDays: () => ({}),
	commandCategories: () => ({}),
	onboardingVariant: 'control',
	onboardingDeliveredAt: null,
	onboardingDeliveryTarget: null,
	onboardingFailedAt: null,
	onboardingError: null,
	memberCount: 0,
	commandRuns: 0
});

module.exports = {
	BotAnalyticsGuildSchema
};
