const { commandMention } = require('../../util/commandMentions');

function createAnalyticsView({ classes, color, icon, items, panel, regions, service, titleCase }) {
	function buildRpgAnalyticsPanel(analytics, view = 'summary') {
		const sections = {
			summary: summarySections,
			progression: progressionSections,
			combat: combatSections,
			economy: economySections,
			leaders: leaderSections,
			content: contentSections,
			growth: growthSections
		};
		const selectedView = sections[view] ? view : 'summary';

		return panel({
			accentColor: color.RPG,
			title: `${icon.settings} **RPG Analytics - ${titleCase(selectedView)}**`,
			subtitle: 'Developer system intelligence',
			sections: sections[selectedView](analytics),
			footer: `${icon.clock} Generated <t:${Math.floor(analytics.generatedAt / 1000)}:R> - Use ${commandMention('rpg admin')} analytics view:<report>`
		});
	}

	function summarySections(analytics) {
		const summary = analytics.summary;
		return [
			[
				`${icon.person} **Profiles:** ${number(summary.profiles)}`,
				`${icon.success} **RPG Access Enabled:** ${number(summary.accessEnabled)}`,
				`${icon.warning} **RPG Access Revoked:** ${number(summary.accessRevoked)}`,
				`${icon.info} **Tutorials:** ${number(summary.tutorialCompleted)} completed / ${number(summary.tutorialSkipped)} skipped / ${number(summary.tutorialOffered)} offered`
			],
			[
				`${icon.clock} **Active Today:** ${number(summary.activeToday)}`,
				`${icon.clock} **Active 7d:** ${number(summary.active7d)}`,
				`${icon.clock} **Active 30d:** ${number(summary.active30d)}`,
				`${icon.owner} **New Characters:** ${number(summary.new7d)} in 7d / ${number(summary.new30d)} in 30d`
			],
			snapshot(analytics)
		];
	}

	function progressionSections(analytics) {
		const progression = analytics.progression;
		return [
			[
				`${icon.level} **Average Rank:** ${number(progression.averageRank, 1)}`,
				`${icon.rank.s} **Highest Rank:** ${number(progression.highestRank)}`,
				`${icon.objective} **Quest Completion:** ${percent(progression.questCompletionRate)}`,
				`${icon.threat} **Boss Completion:** ${percent(progression.bossCompletionRate)}`,
				`${icon.objective} **Active NPC Quests:** ${number(progression.activeQuests)}`
			],
			`${icon.compass} **Regions**\n${map(progression.regionCounts, (id) => regions[id]?.name || titleCase(id))}`,
			`${icon.class} **Classes**\n${map(progression.classCounts, (id) => classes[id]?.name || titleCase(id))}`,
			`${icon.threat} **Boss Defeats**\n${map(progression.bossDefeats, (id) => service.getBossById(id).name)}`
		];
	}

	function combatSections(analytics) {
		const combat = analytics.combat;
		return [
			[
				`${icon.threat} **Total Battles:** ${number(combat.totalBattles)}`,
				`${icon.success} **Wins:** ${number(combat.battlesWon)}`,
				`${icon.fail} **Losses:** ${number(combat.battlesLost)}`,
				`${icon.settings} **Win Rate:** ${percent(combat.winRate)}`,
				`${icon.warning} **No-Battle Profiles:** ${number(combat.noBattleProfiles)}`
			],
			`${icon.info} **Combat Load**\nAverage battles per character: **${number(combat.averageBattles, 1)}**\nThis helps spot whether users are creating characters but not entering encounters.`
		];
	}

	function economySections(analytics) {
		const economy = analytics.economy;
		return [
			[
				`${icon.coin} **Total Gold:** ${number(economy.totalGold)}`,
				`${icon.coin} **Average Gold:** ${number(economy.averageGold, 1)}`,
				`${icon.shards} **Total Shards:** ${number(economy.totalShards)}`,
				`${icon.shards} **Average Shards:** ${number(economy.averageShards, 1)}`
			],
			[
				`${icon.folder} **Inventory Items:** ${number(economy.inventoryItems)}`,
				`${icon.folder} **Average Inventory:** ${number(economy.averageInventoryItems, 1)} items per character`
			],
			`${icon.loot} **Most Owned Items**\n${itemOwnership(economy.itemOwnership)}`,
			`${icon.equipment} **Equipped Weapons**\n${map(economy.equipped.weapon, itemLabel)}`
		];
	}

	function leaderSections(analytics) {
		return [
			`${icon.rank.s} **Top Rank**\n${topProfiles(analytics.leaders.rank, 'Rank')}`,
			`${icon.coin} **Top Gold**\n${topProfiles(analytics.leaders.gold, 'Gold')}`,
			`${icon.success} **Top Wins**\n${topProfiles(analytics.leaders.wins, 'Wins')}`,
			`${icon.clock} **Recently Active**\n${recentProfiles(analytics.leaders.recent)}`
		];
	}

	function contentSections(analytics) {
		const content = analytics.content;
		return [
			[
				`${icon.class} **Classes:** ${number(content.classes)}`,
				`${icon.compass} **Regions:** ${number(content.regions)}`,
				`${icon.loot} **Items:** ${number(content.items)}`,
				`${icon.objective} **NPC Quests:** ${number(content.npcQuests)}`
			],
			[
				`${icon.threat} **Bosses:** ${number(content.bosses)}`,
				`${icon.warning} **Mobs:** ${number(content.mobs)}`,
				`${icon.chapter} **Story Steps:** ${number(content.questSteps)}`
			],
			`${icon.info} **Runtime Snapshot**\n${snapshot(analytics)}`
		];
	}

	function growthSections(analytics) {
		const growth = analytics.growth;
		return [
			[
				`${icon.person} **Shared Cards:** ${number(growth.shares)}`,
				`${icon.success} **Referral Conversions:** ${number(growth.referrals)}`,
				`${icon.loot} **Badges Owned:** ${number(growth.badgesOwned)}`,
				`${icon.info} **Achievement Unlocks:** ${number(growth.achievementUnlocks)}`
			],
			[
				`${icon.compass} **Season Claims:** ${number(growth.seasonClaims)}`,
				`${icon.threat} **Active Server Bosses:** ${number(growth.activeServerBosses)}`,
				`${icon.success} **Defeated Server Bosses:** ${number(growth.defeatedServerBosses)}`,
				`${icon.person} **Boss Contributors:** ${number(growth.bossContributors)}`
			],
			`${icon.info} **Growth Principle**\nLimited rewards provide usable equipment, while badges preserve visible social and progression achievements.`
		];
	}

	function snapshot(analytics) {
		return [
			`${icon.level} Average Rank **${number(analytics.progression.averageRank, 1)}**`,
			`${icon.settings} Combat Win Rate **${percent(analytics.combat.winRate)}**`,
			`${icon.coin} Gold In Circulation **${number(analytics.economy.totalGold)}**`,
			`${icon.loot} Inventory Items **${number(analytics.economy.inventoryItems)}**`
		].join('\n');
	}

	function map(counts = {}, labeler = titleCase, limit = 8) {
		const rows = Object.entries(counts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, limit)
			.map(([key, value]) => `${icon.arrowRight} **${labeler(key)}:** ${number(value)}`);
		return rows.length ? rows.join('\n') : 'No data recorded yet.';
	}

	function itemOwnership(ownership = {}) {
		const rows = Object.entries(ownership)
			.sort(([, a], [, b]) => (b.quantity || 0) - (a.quantity || 0))
			.slice(0, 8)
			.map(([itemId, data]) => `${icon.arrowRight} **${itemLabel(itemId)}:** ${number(data.quantity)} owned by ${number(data.owners)}`);
		return rows.length ? rows.join('\n') : 'No items owned yet.';
	}

	function topProfiles(profiles = [], valueLabel) {
		return profiles.length
			? profiles
					.map((profile, index) => {
						const region = regions[profile.region]?.name || titleCase(profile.region);
						return `#${index + 1} **${profile.name || 'Unknown'}** (<@${profile.userId}>) - ${valueLabel} **${number(profile.value)}** - ${region}`;
					})
					.join('\n')
			: 'No profile data yet.';
	}

	function recentProfiles(profiles = []) {
		return profiles.length
			? profiles
					.map((profile) => {
						const region = regions[profile.region]?.name || titleCase(profile.region);
						return `${icon.arrowRight} **${profile.name || 'Unknown'}** (<@${profile.userId}>) - ${region} - <t:${Math.floor((profile.updatedAt || 0) / 1000)}:R>`;
					})
					.join('\n')
			: 'No recent profile activity.';
	}

	function itemLabel(itemId) {
		if (itemId === 'none') return 'None';
		return items[itemId]?.name || titleCase(itemId);
	}

	function number(value, digits = 0) {
		return Number(value || 0).toLocaleString(undefined, {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		});
	}

	function percent(value) {
		return `${Math.round(Number(value || 0) * 100)}%`;
	}

	return buildRpgAnalyticsPanel;
}

module.exports = {
	createAnalyticsView
};
