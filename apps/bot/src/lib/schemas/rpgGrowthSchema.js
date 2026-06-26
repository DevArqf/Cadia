const { createModel } = require('../database/model');

const RpgGrowthSchema = createModel('RpgGrowthSchema', {
	guildId: null,
	userId: null,
	firstSeenAt: () => Date.now(),
	lastActiveAt: null,
	activeDays: () => ({}),
	tutorialOfferedAt: null,
	tutorialStartedAt: null,
	tutorialCompletedAt: null,
	tutorialSkippedAt: null,
	characterCreatedAt: null,
	firstAdventureAt: null,
	firstVictoryAt: null,
	secondActiveDayAt: null,
	retained7At: null,
	updatedAt: () => Date.now()
});

module.exports = {
	RpgGrowthSchema
};
