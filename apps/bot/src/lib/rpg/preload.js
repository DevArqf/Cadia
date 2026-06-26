const { preloadBattleAssets } = require('./battleCanvas');
const { preloadLeaderboardAssets } = require('./leaderboardCanvas');
const { preloadQuestAssets } = require('./questCanvas');

async function preloadRpgAssets(client) {
	const startedAt = Date.now();
	await Promise.allSettled([preloadBattleAssets(), preloadLeaderboardAssets(), preloadQuestAssets()]);
	client.logger?.debug?.(`Preloaded RPG image assets in ${Date.now() - startedAt}ms.`);
}

module.exports = {
	preloadRpgAssets
};
