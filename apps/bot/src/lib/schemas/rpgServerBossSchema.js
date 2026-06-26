const { createModel } = require('../database/model');

const RpgServerBossSchema = createModel('RpgServerBossSchema', {
	guildId: null,
	seasonId: null,
	name: null,
	maxHp: 0,
	hp: 0,
	status: 'active',
	contributions: () => ({}),
	lastAttacks: () => ({}),
	startedAt: () => Date.now(),
	defeatedAt: null,
	updatedAt: () => Date.now()
});

module.exports = { RpgServerBossSchema };
