const { createModel } = require('../database/model');

module.exports = createModel('guildSettingsSchema', {
	guildId: null,
	prefix: 'cd ',
	updateChannelId: null,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now(),
	updatedBy: null
});
