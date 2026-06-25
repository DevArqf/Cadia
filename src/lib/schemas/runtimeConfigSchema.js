const { createModel } = require('../database/model');

const RuntimeConfigSchema = createModel('runtime_config', {
	key: '',
	value: null,
	updatedAt: 0,
	updatedBy: null
});

module.exports = { RuntimeConfigSchema };
