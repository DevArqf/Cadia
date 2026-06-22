const { ButtonStyle } = require('discord.js');

const { badgeEmoji } = require('../../badges');

function createProfileView({
	actionButton,
	badges,
	classes,
	color,
	formatCompactStats,
	formatProfileEquipment,
	healthBar,
	icon,
	nextUnlock,
	panel,
	percentage,
	profileFlavor,
	rankForLevel,
	regions,
	sceneImages,
	service,
	titleCase,
	xpRemaining
}) {
	function buildProfilePanel(profile, user, playerGrowth = null) {
		const region = regions[profile.region];
		const archetype = classes[profile.classId];
		const stats = service.getEffectiveStats(profile);
		const rank = rankForLevel(profile.level);
		return panel({
			accentColor: profileAccent(profile),
			title: `${icon.owner} **${archetype.name} Warden** - ${titleCase(profile.origin)}`,
			subtitle: `${profile.name} - ${rank.emoji} Rank ${rank.number}`,
			subtitle2: `Character ID: \`${profile.characterId}\``,
			image: sceneImages.profile,
			sections: [
				`${icon.level} **Level ${profile.level}** -> **Level ${profile.level + 1}**\n${icon.level} You are **${percentage(profile.xp, service.xpPerLevel)}** way there. Keep going, you'll reach **100%** soon!\n${icon.xpLabel} **${xpRemaining(profile)}XP** Remaining`,
				`**HP** ${profile.hp}/${profile.maxHp}\n${healthBar(profile.hp, profile.maxHp)} **${percentage(profile.hp, profile.maxHp)}**`,
				[
					`${icon.owner} **|** ${user} **-** \`${profile.characterId}\``,
					`${icon.region} **|** ${region.name}`,
					`${icon.coin} **|** **${profile.gold.toLocaleString()}** Gold`,
					`${icon.shards} **|** **${profile.relicShards.toLocaleString()}** Shards`
				],
				`${icon.settings} **Stats**\n${formatCompactStats(stats)}`,
				formatProfileEquipment(profile),
				formatBadge(playerGrowth),
				`${profileFlavor(profile)}\n${icon.arrowRight} **Next Unlock:** ${nextUnlock(profile)}`
			],
			buttons: [
				actionButton(`rpg-profile:${profile.characterId}:inventory`, 'Inventory', ButtonStyle.Secondary, icon.folder),
				actionButton(`rpg-profile:${profile.characterId}:quest`, 'Quests', ButtonStyle.Secondary, icon.objective),
				actionButton(`rpg-profile:${profile.characterId}:equip`, 'Equip', ButtonStyle.Secondary, icon.equipment),
				actionButton(`rpg-profile:${profile.characterId}:travel`, 'Travel', ButtonStyle.Secondary, icon.compass)
			],
			footer: `${icon.clock} Last updated <t:${Math.floor(profile.updatedAt / 1000)}:R>`
		});
	}

	function formatBadge(playerGrowth) {
		const badge = badges[playerGrowth?.featuredBadge];
		if (!badge) return `${icon.info} **Featured Badge:** None\n-# Earn badges from seasons, referrals, and server bosses.`;
		return `${badgeEmoji(badge)} **Featured Badge: ${badge.name}**\n-# ${badge.description}`;
	}

	function buildAdminProfilePanel(profile, owner, title, note) {
		const inventoryCount = (profile.inventory || []).reduce((total, entry) => total + (entry.quantity || 0), 0);
		return panel({
			accentColor: color.RPG,
			title: `${icon.settings} **RPG Admin - ${title}**`,
			subtitle: 'Developer character control panel',
			sections: [
				note,
				[
					`${icon.info} **Character ID:** \`${profile.characterId}\``,
					`${icon.person} **Owner:** ${owner}`,
					`${icon.person} **User ID:** \`${profile.userId}\``,
					`${icon.person} **Name:** ${profile.name}`
				],
				[
					`${icon.level} **Level:** ${profile.level}`,
					`${icon.xpLabel} **XP:** ${profile.xp}/${service.xpPerLevel}`,
					`${icon.coin} **Gold:** ${profile.gold.toLocaleString()}`,
					`${icon.shards} **Relic Shards:** ${profile.relicShards.toLocaleString()}`
				],
				[
					`${icon.compass} **Region:** ${regions[profile.region]?.name ?? profile.region}`,
					`${icon.success} **Wins:** ${profile.battlesWon}`,
					`${icon.fail} **Losses:** ${profile.battlesLost}`,
					`${icon.equipment} **Inventory Items:** ${inventoryCount}`
				]
			],
			footer: `${icon.clock} Admin lookup <t:${Math.floor(Date.now() / 1000)}:R>`
		});
	}

	function profileAccent(profile) {
		if (profile.level >= 20) return '#d4af37';
		if (profile.level >= 12) return '#7c3aed';
		if (profile.level >= 7) return '#3b82f6';
		if (profile.level >= 3) return color.success;
		return '#80848e';
	}

	return { buildAdminProfilePanel, buildProfilePanel };
}

module.exports = { createProfileView };
