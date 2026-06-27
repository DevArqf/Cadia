const { createModel } = require('../database/model');
const { DEFAULT_PANEL_APPEARANCE, DEFAULT_POST_APPEARANCE } = require('../suggestions/appearance');

module.exports = createModel('suggestionConfigSchema', {
	guildId: null,
	channelId: null,
	panelMessageId: null,
	style: 'embed',
	panel: () => ({ ...DEFAULT_PANEL_APPEARANCE }),
	post: () => ({ ...DEFAULT_POST_APPEARANCE }),
	enabled: true,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});
