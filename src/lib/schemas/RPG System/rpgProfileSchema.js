const { createModel } = require('../../database/model');

const RpgProfileSchema = createModel('rpgProfileSchema', {
	guildId: null,
	userId: null,
	characterId: null,
	name: null,
	classId: null,
	origin: null,
	level: 1,
	xp: 0,
	gold: 0,
	hp: 30,
	maxHp: 30,
	stats: () => ({ hp: 30, attack: 5, defense: 3, speed: 3, luck: 2, focus: 2 }),
	region: 'broken-gate',
	questStep: 0,
	activeQuest: null,
	completedQuests: () => [],
	relicShards: 0,
	battlesWon: 0,
	battlesLost: 0,
	defeatedBosses: () => [],
	inventory: () => [],
	equipment: () => ({ weapon: null, armor: null, charm: null }),
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	RpgProfileSchema
};
