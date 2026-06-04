const { createModel } = require('../database/model');

const UserSettingsSchema = createModel('UserSettingSchema', {
	receiveDMs: true
});

module.exports = { UserSettingsSchema };
