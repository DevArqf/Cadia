const DAY_MS = 86_400_000;
const ACTIVATION_COMMAND_COUNT = 2;
const LOW_INTENT_COMMANDS = new Set(['help', 'invite', 'ping']);
const { getGrowthConfig } = require('../../config/growth');

function commandPathFromInteraction(interaction) {
	const parts = [interaction?.commandName];
	const group = interaction?.options?.getSubcommandGroup?.(false);
	const subcommand = interaction?.options?.getSubcommand?.(false);
	if (group) parts.push(group);
	if (subcommand) parts.push(subcommand);
	return normalizeCommandPath(parts.filter(Boolean).join(' '));
}

function normalizeCommandPath(commandName) {
	return String(commandName || 'unknown')
		.replace(/^\//, '')
		.trim()
		.replace(/\s+/g, ' ')
		.toLowerCase();
}

function commandCategory(command, commandPath) {
	if (normalizeCommandPath(commandPath).startsWith('rpg')) return 'rpg';
	const location = command?.location?.full || '';
	const match = location.match(/commands[\\/](Developer|Fun|General|Information|Miscellaneous|Moderation|Systems|Utility)[\\/]/i);
	if (match) return match[1].toLowerCase();
	return 'other';
}

function isMeaningfulCommand({ commandPath, category, isDeveloper = false }) {
	if (isDeveloper || category === 'developer') return false;
	const rootCommand = normalizeCommandPath(commandPath).split(' ')[0];
	return !LOW_INTENT_COMMANDS.has(rootCommand);
}

function excludedGuildIds(value = process.env.GROWTH_EXCLUDED_GUILDS) {
	if (value === process.env.GROWTH_EXCLUDED_GUILDS) return new Set(getGrowthConfig().excludedGuildIds);
	return new Set(
		String(value || '')
			.split(/[,\s]+/)
			.map((entry) => entry.trim())
			.filter(Boolean)
	);
}

function isExcludedGuild(guildId, value) {
	return Boolean(guildId && excludedGuildIds(value).has(guildId));
}

function selectOnboardingVariant(guildId, mode = process.env.GROWTH_ONBOARDING_EXPERIMENT || 'rpg-first') {
	if (mode === process.env.GROWTH_ONBOARDING_EXPERIMENT || mode === undefined) mode = getGrowthConfig().experimentMode;
	if (mode === 'guided' || mode === 'rpg-first') return 'rpg-first';
	if (mode !== 'split') return 'control';
	return stableBucket(guildId) % 2 === 0 ? 'control' : 'rpg-first';
}

function calculateGrowthMetrics({ dailyRows = [], guildRows = [], now = Date.now(), days = 14, excludedIds = new Set() }) {
	const since = now - Math.max(days, 1) * DAY_MS;
	const weekSince = now - 7 * DAY_MS;
	const includedGuilds = guildRows.filter((guild) => !excludedIds.has(guild.guildId));
	const cohort = includedGuilds.filter((guild) => cohortJoinTime(guild) >= since && cohortJoinTime(guild) <= now);
	const weeklyActiveGuildIds = new Set();

	for (const day of dailyRows) {
		if (dayTimestamp(day.day) < weekSince) continue;
		for (const guildId of Object.keys(day.meaningfulGuilds || {})) {
			if (!excludedIds.has(guildId)) weeklyActiveGuildIds.add(guildId);
		}
	}

	const activated = cohort.filter((guild) => guild.activatedAt);
	const timeToFirstCommand = cohort
		.filter((guild) => guild.firstMeaningfulCommandAt)
		.map((guild) => guild.firstMeaningfulCommandAt - cohortJoinTime(guild))
		.filter((duration) => duration >= 0);
	const retention7 = retentionRate(includedGuilds, 7, now);
	const retention30 = retentionRate(includedGuilds, 30, now);
	const onboardingDelivered = cohort.filter((guild) => guild.onboardingDeliveredAt).length;
	const firstMeaningful = cohort.filter((guild) => guild.firstMeaningfulCommandAt).length;
	const left = cohort.filter((guild) => guild.leftAt && guild.leftAt >= cohortJoinTime(guild)).length;

	return {
		instrumentedDays: new Set(dailyRows.filter((day) => day.growthInstrumentedAt).map((day) => day.day)).size,
		baselineReady:
			new Set(dailyRows.filter((day) => day.growthInstrumentedAt).map((day) => day.day)).size >= 14,
		weeklyActiveGuilds: weeklyActiveGuildIds.size,
		joinedGuilds: cohort.length,
		onboardingDelivered,
		firstMeaningfulGuilds: firstMeaningful,
		activatedGuilds: activated.length,
		activationRate: ratio(activated.length, cohort.length),
		onboardingDeliveryRate: ratio(onboardingDelivered, cohort.length),
		firstMeaningfulRate: ratio(firstMeaningful, cohort.length),
		medianTimeToFirstCommandMs: median(timeToFirstCommand),
		retention7,
		retention30,
		removalRate: ratio(left, cohort.length),
		variants: variantMetrics(cohort)
	};
}

function retentionRate(guildRows, days, now) {
	const threshold = days * DAY_MS;
	const eligible = guildRows.filter((guild) => cohortJoinTime(guild) && now - cohortJoinTime(guild) >= threshold);
	const retained = eligible.filter((guild) => {
		const retainedAt = days === 7 ? guild.retained7At : guild.retained30At;
		return Boolean(retainedAt && retainedAt >= cohortJoinTime(guild) + threshold);
	});
	return { eligible: eligible.length, retained: retained.length, rate: ratio(retained.length, eligible.length) };
}

function variantMetrics(cohort) {
	return ['control', 'rpg-first'].map((variant) => {
		const rows = cohort.filter((guild) => normalizeOnboardingVariant(guild.onboardingVariant) === variant);
		const activated = rows.filter((guild) => guild.activatedAt).length;
		const removed = rows.filter((guild) => guild.leftAt && guild.leftAt >= cohortJoinTime(guild)).length;
		return {
			variant,
			joined: rows.length,
			activated,
			activationRate: ratio(activated, rows.length),
			removed,
			removalRate: ratio(removed, rows.length)
		};
	});
}

function normalizeOnboardingVariant(variant) {
	return variant === 'guided' ? 'rpg-first' : variant || 'control';
}

function markRetention(guildDocument, now) {
	const joinedAt = cohortJoinTime(guildDocument);
	if (!joinedAt) return;
	const elapsed = now - joinedAt;
	if (elapsed >= 7 * DAY_MS && !guildDocument.retained7At) guildDocument.retained7At = now;
	if (elapsed >= 30 * DAY_MS && !guildDocument.retained30At) guildDocument.retained30At = now;
}

function cohortJoinTime(guild) {
	return Number(guild.cohortTrackedAt || 0);
}

function median(values) {
	if (!values.length) return null;
	const ordered = [...values].sort((left, right) => left - right);
	const middle = Math.floor(ordered.length / 2);
	return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function ratio(part, total) {
	return total ? part / total : 0;
}

function stableBucket(value) {
	let hash = 0;
	for (const character of String(value || '')) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	return hash;
}

function dayTimestamp(day) {
	const parsed = Date.parse(`${day}T00:00:00.000Z`);
	return Number.isNaN(parsed) ? 0 : parsed;
}

module.exports = {
	ACTIVATION_COMMAND_COUNT,
	DAY_MS,
	calculateGrowthMetrics,
	commandCategory,
	commandPathFromInteraction,
	excludedGuildIds,
	isExcludedGuild,
	isMeaningfulCommand,
	markRetention,
	normalizeCommandPath,
	selectOnboardingVariant
};
