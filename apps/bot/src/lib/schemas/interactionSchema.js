const { createModel } = require('../database/model');

module.exports = createModel('interactionSchema', {
	Hug: 0,
	HugGive: 0,
	Slap: 0,
	SlapGive: 0,
	Fail: 0,
	Kill: 0,
	KillGive: 0,
	Err: 0,
	Kiss: 0,
	KissGive: 0
});
