const { createModel } = require('../database/model');

module.exports = createModel('levelSchema', {
	guildId: null,
	userId: null,
	userXp: 0,
	userLevel: 1,
	totalXp: 0
});
