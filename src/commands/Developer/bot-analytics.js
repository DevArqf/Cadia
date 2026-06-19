const { MessageFlags } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { componentReply, panel } = require('../../lib/util/components');
const { getBotAnalytics } = require('../../lib/util/botAnalytics');

const analyticsViews = [
	{ name: 'Overview', value: 'overview' },
	{ name: 'Daily Activity', value: 'daily' },
	{ name: 'Growth', value: 'growth' },
	{ name: 'Growth Funnel', value: 'funnel' },
	{ name: 'Commands', value: 'commands' },
	{ name: 'Guilds', value: 'guilds' },
	{ name: 'Users', value: 'users' }
];

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'View developer-only bot growth and activity analytics'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('bot-analytics')
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('view')
						.setDescription('The analytics report to view')
						.setRequired(false)
						.addChoices(...analyticsViews)
				)
				.addIntegerOption((option) =>
					option.setName('days').setDescription('How many days to include').setMinValue(1).setMaxValue(90).setRequired(false)
				)
		);
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const view = interaction.options.getString('view') || 'overview';
		const days = interaction.options.getInteger('days') || 14;
		const analytics = await getBotAnalytics(interaction.client, days);

		return interaction.editReply(componentReply(buildAnalyticsPanel(analytics, view), true));
	}
}

function buildAnalyticsPanel(analytics, view) {
	const selectedView = analyticsViews.some((entry) => entry.value === view) ? view : 'overview';

	return panel({
		accentColor: color.default,
		title: `${emojis.custom.settings} **Cadia Bot Analytics**`,
		subtitle: `${labelForView(selectedView)} report over the last ${analytics.days} day${analytics.days === 1 ? '' : 's'}`,
		sections: buildSections(analytics, selectedView),
		footer: `${emojis.custom.clock} Generated <t:${Math.floor(analytics.generatedAt / 1000)}:R> - Developer only`
	});
}

function buildSections(analytics, view) {
	const sections = {
		overview: overviewSections,
		daily: dailySections,
		growth: growthSections,
		funnel: funnelSections,
		commands: commandSections,
		guilds: guildSections,
		users: userSections
	};

	return sections[view](analytics);
}

function overviewSections(analytics) {
	return [
		[
			`${emojis.custom.community} **Servers:** ${formatNumber(analytics.current.guilds)}`,
			`${emojis.custom.person} **Total Users:** ${formatNumber(analytics.current.totalMemberCount)} server memberships`,
			`${emojis.custom.person} **Tracked Unique Users:** ${formatNumber(analytics.current.trackedUsers)}`,
			`${emojis.custom.openfolder} **Tracked Guilds:** ${formatNumber(analytics.current.trackedGuilds)}`,
			`${emojis.custom.clock} **Uptime:** ${formatDuration(analytics.current.uptimeMs)}`,
			`${emojis.custom.connected} **Gateway Ping:** ${analytics.current.wsPing === null ? 'Unknown' : `${analytics.current.wsPing}ms`}`
		].join('\n'),
		[
			`${emojis.custom.slash} **Commands Ran:** ${formatNumber(analytics.totals.commandRuns)}`,
			`${emojis.custom.community} **Weekly Active Guilds:** ${formatNumber(analytics.growth.weeklyActiveGuilds)}`,
			`${emojis.custom.success} **Meaningful Runs:** ${formatNumber(analytics.totals.meaningfulCommandRuns)}`,
			`${emojis.custom.person} **Unique Command Users:** ${formatNumber(analytics.totals.uniqueCommandUsers)}`,
			`${emojis.custom.success} **Slash Commands:** ${formatNumber(analytics.totals.slashCommandRuns)}`,
			`${emojis.custom.pencil} **Message Commands:** ${formatNumber(analytics.totals.messageCommandRuns)}`,
			`${emojis.custom.fail} **Command Errors:** ${formatNumber(analytics.totals.commandErrors)}`,
			`${emojis.custom.forbidden} **Denied Commands:** ${formatNumber(analytics.totals.commandDenied)}`
		].join('\n'),
		snapshotSection(analytics)
	];
}

function dailySections(analytics) {
	return [
		`${emojis.custom.calendar} **Commands Per Day**\n${formatDailyRows(analytics.daily, (day) => `${day.day}: ${formatNumber(day.commandRuns)} command(s) by ${formatNumber(day.uniqueCommandUsers)} user(s)`)}`,
		`${emojis.custom.warning} **Reliability Per Day**\n${formatDailyRows(analytics.daily, (day) => `${day.day}: ${formatNumber(day.commandErrors)} error(s), ${formatNumber(day.commandDenied)} denied`)}`,
		snapshotSection(analytics)
	];
}

function growthSections(analytics) {
	const growth = analytics.growth;
	return [
		[
			`${emojis.custom.community} **Weekly Active Guilds:** ${formatNumber(growth.weeklyActiveGuilds)}`,
			`${emojis.custom.success} **Activation Rate:** ${formatRatio(growth.activationRate)}`,
			`${emojis.custom.clock} **Median Time to First Meaningful Command:** ${formatMetricDuration(growth.medianTimeToFirstCommandMs)}`,
			`${emojis.custom.update} **7-Day Retention:** ${formatRetention(growth.retention7)}`,
			`${emojis.custom.calendar} **30-Day Retention:** ${formatRetention(growth.retention30)}`,
			`${emojis.custom.trash} **Removal Rate:** ${formatRatio(growth.removalRate)}`
		].join('\n'),
		[
			`${emojis.custom.person} **New Users Tracked:** ${formatNumber(analytics.totals.newUsers)}`,
			`${emojis.custom.success} **Member Joins:** ${formatNumber(analytics.totals.memberJoins)}`,
			`${emojis.custom.warning} **Member Leaves:** ${formatNumber(analytics.totals.memberLeaves)}`,
			`${emojis.custom.openfolder} **Guild Joins:** ${formatNumber(analytics.totals.guildJoins)}`,
			`${emojis.custom.trash} **Guild Leaves:** ${formatNumber(analytics.totals.guildLeaves)}`,
			`${emojis.custom.settings} **Net Guild Growth:** ${formatSigned(analytics.totals.guildJoins - analytics.totals.guildLeaves)}`
		].join('\n'),
		`${emojis.custom.calendar} **Daily Growth**\n${formatDailyRows(analytics.daily, (day) => `${day.day}: +${formatNumber(day.guildJoins)} guilds, -${formatNumber(day.guildLeaves)} guilds, ${formatNumber(day.meaningfulCommandRuns)} meaningful run(s)`)}`,
		baselineSection(growth)
	];
}

function funnelSections(analytics) {
	const growth = analytics.growth;
	return [
		[
			`${emojis.custom.openfolder} **Joined:** ${formatNumber(growth.joinedGuilds)}`,
			`${emojis.custom.mail} **Onboarding Delivered:** ${formatNumber(growth.onboardingDelivered)} (${formatRatio(growth.onboardingDeliveryRate)})`,
			`${emojis.custom.slash} **First Meaningful Command:** ${formatNumber(growth.firstMeaningfulGuilds)} (${formatRatio(growth.firstMeaningfulRate)})`,
			`${emojis.custom.success} **Activated (2 distinct commands):** ${formatNumber(growth.activatedGuilds)} (${formatRatio(growth.activationRate)})`,
			`${emojis.custom.update} **Retained at 7 Days:** ${formatRetention(growth.retention7)}`,
			`${emojis.custom.calendar} **Retained at 30 Days:** ${formatRetention(growth.retention30)}`
		].join('\n'),
		`${emojis.custom.settings} **Experiment Variants**\n${growth.variants
			.map(
				(variant) =>
					`${variant.variant}: ${formatNumber(variant.joined)} joined, ${formatRatio(variant.activationRate)} activated, ${formatRatio(variant.removalRate)} removed`
			)
			.join('\n')}`,
		baselineSection(growth)
	];
}

function commandSections(analytics) {
	return [
		`${emojis.custom.slash} **Top Commands**\n${formatTopList(analytics.topCommands, (entry) => `/${entry.key} - ${formatNumber(entry.count)} run(s)`)}`,
		`${emojis.custom.openfolder} **Meaningful Activity by Category**\n${formatCountMap(analytics.totals.commandCategories)}`,
		[
			`${emojis.custom.success} **Successful Runs:** ${formatNumber(analytics.totals.commandRuns)}`,
			`${emojis.custom.fail} **Errors:** ${formatNumber(analytics.totals.commandErrors)}`,
			`${emojis.custom.forbidden} **Denied:** ${formatNumber(analytics.totals.commandDenied)}`,
			`${emojis.custom.info} **Error Rate:** ${formatPercent(analytics.totals.commandErrors, analytics.totals.commandRuns + analytics.totals.commandErrors)}`
		].join('\n'),
		`${emojis.custom.calendar} **Recent Command Volume**\n${formatDailyRows(analytics.daily, (day) => `${day.day}: ${bar(day.commandRuns, analytics.daily)} ${formatNumber(day.commandRuns)}`)}`
	];
}

function guildSections(analytics) {
	return [
		`${emojis.custom.openfolder} **Most Active Guilds In Range**\n${formatTopList(analytics.topGuilds, (entry) => `${entry.name} (${entry.key}) - ${formatNumber(entry.count)} command(s)`)}`,
		`${emojis.custom.community} **Top Tracked Guilds All Time**\n${formatTopList(analytics.topTrackedGuilds, (guild) => `${guild.name} (${guild.id}) - ${formatNumber(guild.commandRuns)} command(s), ${formatNumber(guild.memberCount)} member(s)`)}`,
		snapshotSection(analytics)
	];
}

function userSections(analytics) {
	return [
		[
			`${emojis.custom.person} **Tracked Unique Users:** ${formatNumber(analytics.current.trackedUsers)}`,
			`${emojis.custom.person} **Unique Command Users In Range:** ${formatNumber(analytics.totals.uniqueCommandUsers)}`,
			`${emojis.custom.success} **New Users In Range:** ${formatNumber(analytics.totals.newUsers)}`,
			`${emojis.custom.community} **Current Server Memberships:** ${formatNumber(analytics.current.totalMemberCount)}`
		].join('\n'),
		`${emojis.custom.clock} **Newest Tracked Users**\n${formatTopList(analytics.recentUsers, (user) => `<@${user.id}> (${user.id}) - first seen ${formatTimestamp(user.firstSeenAt)}, ${formatNumber(user.commandRuns)} command(s)`)}`,
		`${emojis.custom.calendar} **New Users Per Day**\n${formatDailyRows(analytics.daily, (day) => `${day.day}: ${formatNumber(day.newUsers)} new tracked user(s)`)}`
	];
}

function snapshotSection(analytics) {
	return [
		`${emojis.custom.info} **Activity Snapshot**`,
		`Commands/day **${formatNumber(average(analytics.totals.commandRuns, analytics.days), 1)}**`,
		`New users/day **${formatNumber(average(analytics.totals.newUsers, analytics.days), 1)}**`,
		`Member joins/day **${formatNumber(average(analytics.totals.memberJoins, analytics.days), 1)}**`
	].join('\n');
}

function baselineSection(growth) {
	return [
		`${emojis.custom.info} **Growth Baseline**`,
		`Instrumented days: **${formatNumber(growth.instrumentedDays)}/14**`,
		growth.baselineReady
			? `${emojis.custom.success} The initial baseline window is complete.`
			: `${emojis.custom.warning} Targets remain intentionally unset until 14 instrumented days are collected.`
	].join('\n');
}

function formatDailyRows(rows, formatter) {
	if (!rows.length) return 'No analytics data has been tracked for this range yet.';
	return rows.slice(-14).map(formatter).join('\n');
}

function formatTopList(rows, formatter) {
	if (!rows.length) return 'No tracked data yet.';
	return rows.map((row, index) => `${index + 1}. ${formatter(row)}`).join('\n');
}

function bar(value, rows) {
	const max = Math.max(...rows.map((row) => row.commandRuns || 0), 1);
	const length = Math.max(1, Math.round(((value || 0) / max) * 12));
	return '#'.repeat(length);
}

function labelForView(view) {
	return analyticsViews.find((entry) => entry.value === view)?.name || 'Overview';
}

function average(total, days) {
	return days ? total / days : 0;
}

function formatNumber(value, fractionDigits = 0) {
	return Number(value || 0).toLocaleString('en-US', {
		maximumFractionDigits: fractionDigits,
		minimumFractionDigits: fractionDigits
	});
}

function formatSigned(value) {
	return `${value >= 0 ? '+' : ''}${formatNumber(value)}`;
}

function formatPercent(part, total) {
	if (!total) return '0%';
	return `${formatNumber((part / total) * 100, 1)}%`;
}

function formatRatio(value) {
	return `${formatNumber((value || 0) * 100, 1)}%`;
}

function formatRetention(retention) {
	return `${formatRatio(retention.rate)} (${formatNumber(retention.retained)}/${formatNumber(retention.eligible)} eligible)`;
}

function formatMetricDuration(ms) {
	if (ms === null || ms === undefined) return 'No data';
	if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
	if (ms < 3_600_000) return `${formatNumber(ms / 60_000, 1)}m`;
	if (ms < 86_400_000) return `${formatNumber(ms / 3_600_000, 1)}h`;
	return `${formatNumber(ms / 86_400_000, 1)}d`;
}

function formatCountMap(counts = {}) {
	const entries = Object.entries(counts).sort(([, left], [, right]) => right - left);
	if (!entries.length) return 'No meaningful activity has been tracked yet.';
	return entries.map(([category, count]) => `${category}: ${formatNumber(count)}`).join('\n');
}

function formatTimestamp(value) {
	if (!value) return 'unknown';
	return `<t:${Math.floor(value / 1000)}:R>`;
}

function formatDuration(ms) {
	const totalSeconds = Math.floor((ms || 0) / 1000);
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	if (days) return `${days}d ${hours}h`;
	if (hours) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}

module.exports = {
	UserCommand
};
