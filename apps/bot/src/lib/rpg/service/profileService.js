const { recordRpgEvent } = require('../growth');
const { syncAchievements } = require('../playerGrowth');
const repositories = require('../repositories');
const {
	RpgError,
	assertDatabaseReady,
	classes,
	generateCharacterId,
	getProfile,
	normalizeCharacterId,
	normalizeProfile,
	requireProfile,
	validateDiscordUserId
} = require('./core');

async function hasRpgAccess(userId) {
	assertDatabaseReady();
	const access = await repositories.access.findOne({ userId });
	return Boolean(access?.enabled);
}

async function grantRpgAccess(userId, grantedBy) {
	return updateAccess(userId, { enabled: true, grantedBy, revokedBy: null });
}

async function revokeRpgAccess(userId, revokedBy) {
	return updateAccess(userId, { enabled: false, revokedBy });
}

async function updateAccess(userId, patch) {
	assertDatabaseReady();
	validateDiscordUserId(userId);
	let access = await repositories.access.findOne({ userId });
	if (!access) access = repositories.access.createRecord({ userId, createdAt: Date.now() });
	Object.assign(access, patch, { updatedAt: Date.now() });
	await access.save();
	return access;
}

async function getRpgAccess(userId) {
	assertDatabaseReady();
	validateDiscordUserId(userId);
	return repositories.access.findOne({ userId });
}

async function shouldOfferTutorial(guildId, userId) {
	assertDatabaseReady();
	const state = await repositories.tutorials.findOne({ userId });
	return !state || (!state.offered && !state.skipped && !state.completed);
}

async function markTutorialOffered(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true });
}

async function markTutorialStarted(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true, started: true });
}

async function markTutorialSkipped(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true, skipped: true, completed: false });
}

async function markTutorialCompleted(guildId, userId) {
	return updateTutorialState(guildId, userId, { offered: true, skipped: false, completed: true });
}

async function updateTutorialState(guildId, userId, patch) {
	assertDatabaseReady();
	let state = await repositories.tutorials.findOne({ userId });
	if (!state) state = repositories.tutorials.createRecord({ guildId, userId, createdAt: Date.now() });
	if (!state.guildId) state.guildId = guildId;
	Object.assign(state, patch, { updatedAt: Date.now() });
	await state.save();
	const event = patch.completed
		? 'tutorial_completed'
		: patch.skipped
			? 'tutorial_skipped'
			: patch.started
				? 'tutorial_started'
				: patch.offered
					? 'tutorial_offered'
					: null;
	if (event) await recordRpgEvent({ guildId, userId, event });
	return state;
}

async function createProfile(guildId, userId, name, classId, origin) {
	if (await getProfile(guildId, userId)) throw new RpgError('You already have an RPG character.');
	const archetype = classes[classId];
	if (!archetype) throw new RpgError('That class does not exist.');
	const stats = { ...archetype.stats };
	const profile = await repositories.profiles.create({
		guildId,
		userId,
		characterId: await generateCharacterId(),
		name,
		classId,
		origin,
		hp: stats.hp,
		maxHp: stats.hp,
		stats,
		gold: 25,
		defeatedBosses: [],
		activeQuest: null,
		completedQuests: [],
		inventory: [{ itemId: 'star_salve', quantity: 1 }],
		equipment: { weapon: null, armor: null, charm: null }
	});
	await recordRpgEvent({ guildId, userId, event: 'character_created' });
	await syncAchievements(profile);
	return profile;
}

async function deleteProfile(guildId, userId) {
	assertDatabaseReady();
	return repositories.profiles.deleteOne({ userId });
}

async function getProfileByCharacterId(characterId) {
	assertDatabaseReady();
	const normalizedId = normalizeCharacterId(characterId);
	let profile = await repositories.profiles.findOne({ characterId: normalizedId });
	if (profile) return normalizeProfile(profile);
	const profiles = await repositories.profiles.find({});
	for (const entry of profiles) await normalizeProfile(entry);
	profile = await repositories.profiles.findOne({ characterId: normalizedId });
	if (!profile) throw new RpgError(`No RPG character found with ID \`${normalizedId}\`.`);
	return normalizeProfile(profile);
}

module.exports = {
	createProfile,
	deleteProfile,
	getProfile,
	getProfileByCharacterId,
	getRpgAccess,
	grantRpgAccess,
	hasRpgAccess,
	markTutorialCompleted,
	markTutorialOffered,
	markTutorialSkipped,
	markTutorialStarted,
	requireProfile,
	revokeRpgAccess,
	shouldOfferTutorial
};
