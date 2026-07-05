const { createModel } = require('../database/model');

const AdminAudit = createModel('admin_audit', {
	action: '',
	details: '',
	actorId: '',
	actorName: '',
	createdAt: 0
});

module.exports = AdminAudit;
