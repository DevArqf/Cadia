const { createModel } = require('../database/model');

module.exports = createModel('suggestionConfigSchema', {
	guildId: null,
	channelId: null,
	panelMessageId: null,
	style: 'embed',
	enabled: true,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});
