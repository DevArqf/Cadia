const { createModel } = require('../database/model');

module.exports = createModel('levelConfigSchema', {
	guildId: null,
	channelId: null,
	enabled: false,
	useEmbed: true,
	messages: []
});
