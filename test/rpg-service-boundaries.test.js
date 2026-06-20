const assert = require('node:assert/strict');
const test = require('node:test');

const service = require('../src/lib/rpg/service');
const administration = require('../src/lib/rpg/service/administrationService');
const combat = require('../src/lib/rpg/service/combatService');
const profile = require('../src/lib/rpg/service/profileService');
const progression = require('../src/lib/rpg/service/progressionService');

test('RPG compatibility service delegates to focused domain services', () => {
	assert.equal(service.createProfile, profile.createProfile);
	assert.equal(service.resolveAdventure, combat.resolveAdventure);
	assert.equal(service.travel, progression.travel);
	assert.equal(service.adminAnalytics, administration.adminAnalytics);
	assert.equal(typeof service.RpgError, 'function');
});
