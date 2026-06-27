const { createModel } = require('../database/model');

module.exports = createModel('interactionSessionSchema', {
	sessionId: null,
	kind: null,
	ownerId: null,
	guildId: null,
	channelId: null,
	messageId: null,
	state: {},
	expiresAt: null,
	createdAt: null,
	updatedAt: null
});
