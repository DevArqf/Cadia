const { createModel } = require('../database/model');

module.exports = createModel('guildCommandConfigSchema', {
	guildId: null,
	modules: () => ({}),
	commands: () => ({}),
	createdAt: () => Date.now(),
	updatedAt: () => Date.now(),
	updatedBy: null
});
