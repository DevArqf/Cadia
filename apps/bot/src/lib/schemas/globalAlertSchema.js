const { createModel } = require('../database/model');

const GlobalAlertSchema = createModel('globalAlertSchema', {
	alertId: null,
	active: true,
	title: null,
	message: null,
	footer: null,
	thumbnail: null,
	style: 'update',
	accentColor: null,
	developerId: null,
	developerTag: null,
	dmEnabled: false,
	dmSent: 0,
	dmFailed: 0,
	dmTargeted: 0,
	channelId: null,
	channelMessageId: null,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	GlobalAlertSchema
};
