const VALID_EXPERIMENT_MODES = new Set(['control', 'rpg-first', 'split']);

function getGrowthConfig(env = process.env) {
	const rawMode = String(env.GROWTH_ONBOARDING_EXPERIMENT || 'rpg-first')
		.trim()
		.toLowerCase();
	const excludedEntries = String(env.GROWTH_EXCLUDED_GUILDS || '')
		.split(/[,\s]+/)
		.map((entry) => entry.trim())
		.filter(Boolean);
	const invalidGuildIds = excludedEntries.filter((guildId) => !/^\d{17,20}$/.test(guildId));
	const excludedGuildIds = [...new Set(excludedEntries.filter((guildId) => /^\d{17,20}$/.test(guildId)))];
	const warnings = [];

	if (!VALID_EXPERIMENT_MODES.has(rawMode)) {
		warnings.push(
			`GROWTH_ONBOARDING_EXPERIMENT "${rawMode}" is invalid; using "rpg-first". Valid modes: ${[...VALID_EXPERIMENT_MODES].join(', ')}.`
		);
	}
	if (invalidGuildIds.length) {
		warnings.push(`GROWTH_EXCLUDED_GUILDS contains invalid Discord guild IDs: ${invalidGuildIds.join(', ')}.`);
	}
	if (!excludedGuildIds.length) {
		warnings.push('GROWTH_EXCLUDED_GUILDS is empty; development and test guild activity may contaminate growth results.');
	}

	return {
		experimentMode: VALID_EXPERIMENT_MODES.has(rawMode) ? rawMode : 'rpg-first',
		excludedGuildIds,
		invalidGuildIds,
		warnings
	};
}

function validateGrowthConfig({ databaseConnected, env = process.env } = {}) {
	const config = getGrowthConfig(env);
	if (databaseConnected === false) {
		config.warnings.push('The analytics database is disconnected; RPG funnel events cannot be recorded.');
	}
	return config;
}

module.exports = {
	VALID_EXPERIMENT_MODES,
	getGrowthConfig,
	validateGrowthConfig
};
