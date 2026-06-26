const { createModel } = require('../database/model');

const WelcomeSchema = createModel('welcomeSchema', {
	guildId: null,
	welcomeChannelId: null,
	enabled: true,
	templateId: 'classic',
	messageType: 'embed',
	message: null,
	title: null,
	footer: null,
	thumbnailImage: null,
	authorName: null,
	iconURL: null,
	hexCode: null,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = { WelcomeSchema };
