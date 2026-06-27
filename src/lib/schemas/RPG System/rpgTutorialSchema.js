const { createModel } = require('../../database/model');

const RpgTutorialSchema = createModel('rpgTutorialSchema', {
	guildId: null,
	userId: null,
	offered: false,
	started: false,
	skipped: false,
	completed: false,
	step: 0,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	RpgTutorialSchema
};
