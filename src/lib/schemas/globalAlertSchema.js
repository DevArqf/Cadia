const { createModel } = require('../database/model');

const GlobalAlertSchema = createModel('globalAlertSchema', {
	alertId: null,
	active: true,
	message: null,
	developerId: null,
	developerTag: null,
	dmSent: 0,
	dmFailed: 0,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	GlobalAlertSchema
};
