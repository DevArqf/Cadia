const { createModel } = require('../database/model');

const GlobalAlertReceiptSchema = createModel('globalAlertReceiptSchema', {
	alertId: null,
	userId: null,
	lastNudgedAt: 0,
	viewedAt: 0,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	GlobalAlertReceiptSchema
};
