const { createModel } = require('../database/model');

module.exports = createModel('suggestionSchema', {
	suggestionId: null,
	guildId: null,
	channelId: null,
	messageId: null,
	authorId: null,
	title: null,
	body: null,
	upvotes: () => [],
	downvotes: () => [],
	status: 'open',
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});
