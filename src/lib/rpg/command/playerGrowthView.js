const {
	ActionRowBuilder,
	ButtonStyle,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder
} = require('discord.js');
const { badgeEmoji, formatBadge } = require('../badges');

function createPlayerGrowthHandlers({
	actionButton,
	color,
	componentReply,
	createAchievementShareCard,
	createCharacterShareCard,
	createRpgLeaderboardCard,
	createSeasonCard,
	growth,
	icon,
	notice,
	panel,
	serverBossImage,
	service
}) {
	const leaderboardPageSize = 6;
	const leaderboardTypes = [
		{ id: 'level', label: 'Level', description: 'Highest level and XP progress', emoji: icon.rank.s },
		{ id: 'gold', label: 'Gold', description: 'Richest Wardens', emoji: icon.coin },
		{ id: 'wins', label: 'Victories', description: 'Most encounters cleared', emoji: icon.success },
		{ id: 'shards', label: 'Relic Shards', description: 'Most story relic shards', emoji: icon.shards }
	];

	async function executeGrowth(operation) {
		try {
			return await operation();
		} catch (error) {
			throw new service.RpgError(error.message);
		}
	}

	async function leaderboard(interaction) {
		const state = { type: 'level', scope: 'guild', page: 0 };
		const customIdBase = `rpg-lb:${interaction.id}`;
		await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
		const message = await interaction.editReply(await buildLeaderboardReply(interaction, state, customIdBase));
		const collector = message.createMessageComponentCollector({ time: 180_000 });

		collector.on('collect', async (componentInteraction) => {
			if (componentInteraction.user.id !== interaction.user.id) {
				return componentInteraction.reply(
					componentReply(notice(`${icon.forbidden} **Not Your Leaderboard**`, 'Run `/rpg leaderboard` to open your own panel.'), true)
				);
			}
			if (!componentInteraction.customId.startsWith(customIdBase)) return;

			await componentInteraction.deferUpdate();
			const action = componentInteraction.customId.split(':').at(-1);
			if (action === 'type') {
				state.type = componentInteraction.values[0];
				state.page = 0;
			} else if (action === 'scope') {
				state.scope = state.scope === 'guild' ? 'global' : 'guild';
				state.page = 0;
			} else if (action === 'prev') {
				state.page = Math.max(state.page - 1, 0);
			} else if (action === 'next') {
				state.page += 1;
			}

			await interaction.editReply(await buildLeaderboardReply(interaction, state, customIdBase));
		});

		collector.on('end', async () => {
			await interaction.editReply(await buildLeaderboardReply(interaction, state, customIdBase, true)).catch(() => null);
		});
	}

	async function buildLeaderboardReply(interaction, state, customIdBase, disabled = false) {
		const isGlobal = state.scope === 'global';
		const allLeaders = isGlobal ? await growth.globalLeaderboard(state.type) : await service.leaderboard(interaction.guild.id, state.type);
		const totalPages = Math.max(Math.ceil(allLeaders.length / leaderboardPageSize), 1);
		state.page = Math.min(Math.max(state.page, 0), totalPages - 1);

		const pageLeaders = allLeaders.slice(state.page * leaderboardPageSize, (state.page + 1) * leaderboardPageSize);
		const selectedType = leaderboardTypes.find((type) => type.id === state.type) ?? leaderboardTypes[0];
		const scopeName = isGlobal ? 'Global Cadia' : interaction.guild.name;
		const scopeLabel = isGlobal ? 'Global' : 'Server';
		const fileName = `rpg-leaderboard-${state.scope}-${state.type}-${state.page + 1}.png`;
		const attachment = await createRpgLeaderboardCard({
			guildName: scopeName,
			leaders: pageLeaders,
			type: state.type,
			page: state.page,
			totalPages,
			fileName,
			resolveUser: (userId) => interaction.client.users.cache.get(userId)
		});

		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${icon.leaderboard} **RPG Leaderboard**\n` +
						`-# ${scopeName} - ${selectedType.label} standings - ${allLeaders.length} registered Wardens`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${icon.info} Showing the **${scopeLabel} ${selectedType.label}** leaderboard, page **${state.page + 1}/${totalPages}**.`
				)
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(`${customIdBase}:type`)
						.setPlaceholder('Choose leaderboard type')
						.setDisabled(disabled)
						.addOptions(
							leaderboardTypes.map((type) =>
								new StringSelectMenuOptionBuilder()
									.setLabel(type.label)
									.setDescription(type.description)
									.setValue(type.id)
									.setDefault(type.id === state.type)
							)
						)
				)
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					actionButton(
						`${customIdBase}:scope`,
						isGlobal ? 'View Server Leaderboard' : 'View Global Leaderboard',
						ButtonStyle.Primary
					).setDisabled(disabled),
					actionButton(`${customIdBase}:prev`, 'Previous', ButtonStyle.Secondary).setDisabled(disabled || state.page <= 0),
					actionButton(`${customIdBase}:next`, 'Next', ButtonStyle.Secondary).setDisabled(disabled || state.page >= totalPages - 1)
				)
			);

		return {
			components: [container],
			files: [attachment],
			flags: MessageFlags.IsComponentsV2
		};
	}

	async function share(interaction) {
		const profile = await service.requireProfile(interaction.guild.id, interaction.user.id);
		const player = await executeGrowth(() => growth.getPlayerGrowth(interaction.user.id));
		const { unlocked } = await executeGrowth(() => growth.syncAchievements(profile));
		const type = interaction.options.getString('type', true);
		let attachment;
		let title;

		if (type === 'achievement') {
			const requestedId = interaction.options.getString('achievement');
			const achievement = (requestedId ? unlocked.find((entry) => entry.id === requestedId) : unlocked.at(-1)) || null;
			if (!achievement) throw new service.RpgError('You have not unlocked that achievement yet.');
			attachment = await createAchievementShareCard({ profile, userName: interaction.user.username, achievement });
			title = `${icon.success} **Achievement Shared: ${achievement.name}**`;
		} else {
			const badge = growth.badges[player.featuredBadge] || null;
			attachment = await createCharacterShareCard({
				profile,
				userName: interaction.user.username,
				badge
			});
			title = `${icon.person} **${profile.name}'s Warden Card**`;
		}

		await executeGrowth(() => growth.recordShare(interaction.user.id));
		const fileName = attachment.name;
		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title}\n-# Shared by ${interaction.user.username}`))
			.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${icon.arrowRight} Create your own legend with \`/rpg tutorial\` and \`/rpg create\`.`)
			);
		return interaction.reply({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
	}

	async function achievements(interaction) {
		const profile = await service.requireProfile(interaction.guild.id, interaction.user.id);
		const result = await executeGrowth(() => growth.syncAchievements(profile));
		const unlockedIds = new Set(result.growth.achievements);
		const entries = growth.achievements.map((achievement) => {
			const unlocked = unlockedIds.has(achievement.id);
			const badge = growth.badges[achievement.badgeId];
			const rewardParts = [];
			if (achievement.rewards.gold) rewardParts.push(`${icon.coin} **${achievement.rewards.gold.toLocaleString()} Gold**`);
			if (achievement.rewards.shards) rewardParts.push(`${icon.shards} **${achievement.rewards.shards.toLocaleString()} Relic Shards**`);
			rewardParts.push(formatBadge(badge));
			return (
				`**${achievement.name}** · ${unlocked ? 'Unlocked' : 'Locked'} · ${achievement.category}\n` +
				`-# ${achievement.description}\n` +
				`**Rewards**\n${rewardParts.join('\n')}`
			);
		});

		const response = componentReply(
			panel({
				accentColor: color.RPG,
				title: `**Warden Achievements**`,
				subtitle: `${growth.achievements.filter((achievement) => unlockedIds.has(achievement.id)).length}/${growth.achievements.length} unlocked · rewards can only be claimed once`,
				sections: entries,
				footer: `Feature an earned badge with /rpg badge, or share an achievement with /rpg share.`
			})
		);
		return interaction.deferred ? interaction.editReply(response) : interaction.reply(response);
	}

	async function badge(interaction) {
		const badgeId = interaction.options.getString('badge', true);
		const result = await executeGrowth(() => growth.setFeaturedBadge(interaction.user.id, badgeId));
		return interaction.reply(
			componentReply(
				notice(
					`${badgeEmoji(result.badge)} **Badge Featured: ${result.badge.name}**`,
					`This badge now appears on your RPG profile and shared character card.`,
					color.success
				),
				true
			)
		);
	}

	async function serverBoss(interaction) {
		const action = interaction.options.getString('action', true);
		const result =
			action === 'attack'
				? await executeGrowth(() => growth.attackServerBoss(interaction.guild.id, interaction.user.id))
				: { boss: await executeGrowth(() => growth.getServerBoss(interaction.guild.id)) };
		const boss = result.boss;
		const contributors = Object.keys(boss.contributions || {}).length;
		const progress = boss.maxHp ? Math.round(((boss.maxHp - boss.hp) / boss.maxHp) * 100) : 0;
		const image = serverBossImage(boss.status);

		return interaction.reply({
			...componentReply(
				panel({
					accentColor: boss.status === 'defeated' ? color.success : color.RPG,
					title: `${icon.threat} **Server Boss: ${boss.name}**`,
					subtitle: boss.status === 'defeated' ? 'Defeated by the community' : 'Cooperative seasonal encounter',
					image: image.url,
					imageDescription:
						boss.status === 'defeated'
							? `${boss.name} defeated with the community reward revealed`
							: `${boss.name} facing the server's Wardens in the storm`,
					sections: [
						[
							`${icon.health.full} **HP:** ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()} (${progress}%)`,
							`${icon.person} **Contributors:** ${contributors}`,
							result.damage ? `${icon.damageDealt} **Your Damage:** ${result.damage.toLocaleString()}` : null,
							result.contribution ? `${icon.success} **Your Total:** ${result.contribution.toLocaleString()}` : null
						].filter(Boolean),
						boss.status === 'defeated'
							? `${icon.loot} Every contributor received **${growth.rewards.raid.item.name}** and the ${formatBadge(growth.rewards.raid.badge)}.`
							: `${icon.arrowRight} Use \`/rpg server-boss action:Attack\` every 30 minutes. Damage scales with your Warden.`
					]
				})
			),
			files: [image.attachment]
		});
	}

	async function season(interaction) {
		const action = interaction.options.getString('action', true);
		await executeGrowth(() => growth.recordSeasonActivity(interaction.user.id));
		const status =
			action === 'claim'
				? await executeGrowth(() => growth.claimSeason(interaction.user.id))
				: await executeGrowth(() => growth.seasonalProgress(interaction.user.id));
		const { season: activeSeason, progress } = status;
		const claimed = status.claimed || action === 'claim';
		const fileName = `rpg-season-${activeSeason.id || 'current'}.png`;
		const attachment = await createSeasonCard({
			season: activeSeason,
			progress,
			complete: status.complete,
			claimed,
			fileName
		});
		const statusText = claimed
			? `${icon.success} **${activeSeason.item.name}** and the ${formatBadge(activeSeason.badge)} are now yours.`
			: status.complete
				? `${icon.arrowRight} Quest complete. Claim it with \`/rpg season action:Claim\`.`
				: `${icon.arrowRight} Complete both objectives before the season ends.`;
		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt((claimed ? color.success : color.RPG).replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${icon.compass} **${activeSeason.name} Season**\n-# Seasonal quest and limited reward`)
			)
			.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusText));
		const response = {
			components: [container],
			files: [attachment],
			flags: MessageFlags.IsComponentsV2
		};
		return interaction.deferred ? interaction.editReply(response) : interaction.reply(response);
	}

	async function refer(interaction) {
		const action = interaction.options.getString('action', true);
		if (action === 'redeem') {
			const code = interaction.options.getString('code');
			if (!code) throw new service.RpgError('Provide the referral code you want to redeem.');
			const result = await executeGrowth(() => growth.redeemReferral(interaction.user.id, code));
			return interaction.reply(
				componentReply(
					notice(
						`${icon.success} **Referral Redeemed**`,
						`You and the referring Warden received **${result.item.name}** and the ${formatBadge(result.badge)}.`,
						color.success
					)
				)
			);
		}

		const player = await executeGrowth(() => growth.getPlayerGrowth(interaction.user.id));
		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.RPG,
					title: `${icon.person} **Invite Another Warden**`,
					subtitle: 'Item and badge referral rewards',
					sections: [
						`${icon.info} **Your Code:** \`${player.referralCode}\``,
						`${icon.success} **Successful Referrals:** ${player.referrals}`,
						`${icon.arrowRight} Your friend creates a Warden, then runs \`/rpg refer action:Redeem code:${player.referralCode}\`.`,
						`${icon.loot} Both players receive **${growth.rewards.referral.item.name}** and the ${formatBadge(growth.rewards.referral.badge)}.`
					]
				}),
				true
			)
		);
	}

	return { achievements, badge, leaderboard, refer, season, serverBoss, share };
}

module.exports = { createPlayerGrowthHandlers };
