const { createModel } = require('../database/model');

const UserSchema = createModel('CountingUserSchema', {
	balance: 0,
	bank: 0,
	createdAt: () => new Date().toISOString(),
	updatedAt: () => new Date().toISOString()
});

module.exports = {
	UserSchema
};
