const { createModel } = require('../database/model');

const GuildSchema = createModel('CountingGuildSchema', {
	countHighscore: 0,
	countLastScore: 0,
	countLastUser: null,
	countLastDate: () => new Date().toISOString(),
	countGoal: 100,
	count: 0,
	createdAt: () => new Date().toISOString(),
	updatedAt: () => new Date().toISOString()
});

module.exports = {
	GuildSchema
};
