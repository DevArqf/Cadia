const { createModel } = require('../database/model');

module.exports = createModel('guildSettingsSchema', {
	guildId: null,
	prefix: 'cd ',
	createdAt: () => Date.now(),
	updatedAt: () => Date.now(),
	updatedBy: null
});
