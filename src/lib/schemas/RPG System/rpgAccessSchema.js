const { createModel } = require('../../database/model');

const RpgAccessSchema = createModel('rpgAccessSchema', {
	userId: null,
	grantedBy: null,
	revokedBy: null,
	enabled: true,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	RpgAccessSchema
};
