const { createModel } = require('../database/model');

const RpgPlayerGrowthSchema = createModel('RpgPlayerGrowthSchema', {
	userId: null,
	referralCode: null,
	referredBy: null,
	referrals: 0,
	cosmetics: () => [],
	badges: () => [],
	featuredBadge: null,
	achievements: () => [],
	seasonClaims: () => [],
	seasonVictories: () => ({}),
	shareCount: 0,
	lastSharedAt: null,
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = { RpgPlayerGrowthSchema };
