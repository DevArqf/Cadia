const administration = require('./service/administrationService');
const combat = require('./service/combatService');
const core = require('./service/core');
const profile = require('./service/profileService');
const progression = require('./service/progressionService');

module.exports = {
	RpgError: core.RpgError,
	...administration,
	...combat,
	...profile,
	...progression,
	availableQuestRegions: core.availableQuestRegions,
	canStartQuest: core.canStartQuest,
	canTravel: core.canTravel,
	getBossById: core.getBossById,
	getBosses: core.getBosses,
	getEffectiveMaxHp: core.getEffectiveMaxHp,
	getEffectiveStats: core.getEffectiveStats,
	getEncounterById: core.getEncounterById,
	getEncounterMatchup: core.getEncounterMatchup,
	getQuestById: core.getQuestById,
	getQuestState: core.getQuestState,
	items: core.items,
	questSteps: core.questSteps,
	regions: core.regions,
	xpForRank: core.xpForRank,
	xpPerLevel: core.xpPerLevel,
	xpToNextRank: core.xpToNextRank
};
