const { createModel } = require('../database/model');

const CountingReward = createModel('CountingRewardSchema', {
	createdAt: () => new Date().toISOString(),
	updatedAt: () => new Date().toISOString()
});
const CountActivity = createModel('CountActivitySchema', {
	count: 0
});

module.exports = {
	CountingReward,
	CountActivity
};
