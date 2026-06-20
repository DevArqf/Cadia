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

function createPlayerGrowthHandlers({
	actionButton,
	color,
	componentReply,
	createAchievementShareCard,
	createCharacterShareCard,
	createRpgLeaderboardCard,
	growth,
	icon,
	notice,
	panel,
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
		const allLeaders = isGlobal
			? await growth.globalLeaderboard(state.type)
			: await service.leaderboard(interaction.guild.id, state.type);
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
			attachment = createAchievementShareCard({ profile, userName: interaction.user.username, achievement });
			title = `${icon.success} **Achievement Shared: ${achievement.name}**`;
		} else {
			const cosmeticId = player.cosmetics.at(-1);
			const cosmetic = Object.values(growth.cosmetics).find((entry) => entry.id === cosmeticId);
			attachment = createCharacterShareCard({
				profile,
				userName: interaction.user.username,
				cosmetic: cosmetic?.name
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

	async function serverBoss(interaction) {
		const action = interaction.options.getString('action', true);
		const result =
			action === 'attack'
				? await executeGrowth(() => growth.attackServerBoss(interaction.guild.id, interaction.user.id))
				: { boss: await executeGrowth(() => growth.getServerBoss(interaction.guild.id)) };
		const boss = result.boss;
		const contributors = Object.keys(boss.contributions || {}).length;
		const progress = boss.maxHp ? Math.round(((boss.maxHp - boss.hp) / boss.maxHp) * 100) : 0;

		return interaction.reply(
			componentReply(
				panel({
					accentColor: boss.status === 'defeated' ? color.success : color.RPG,
					title: `${icon.threat} **Server Boss: ${boss.name}**`,
					subtitle: boss.status === 'defeated' ? 'Defeated by the community' : 'Cooperative seasonal encounter',
					sections: [
						[
							`${icon.health.full} **HP:** ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()} (${progress}%)`,
							`${icon.person} **Contributors:** ${contributors}`,
							result.damage ? `${icon.damageDealt} **Your Damage:** ${result.damage.toLocaleString()}` : null,
							result.contribution ? `${icon.success} **Your Total:** ${result.contribution.toLocaleString()}` : null
						].filter(Boolean),
						boss.status === 'defeated'
							? `${icon.loot} Every contributor received the limited **${growth.cosmetics.raid.name}** cosmetic.`
							: `${icon.arrowRight} Use \`/rpg server-boss action:Attack\` every 30 minutes. Damage scales with your Warden.`
					]
				})
			)
		);
	}

	async function season(interaction) {
		const action = interaction.options.getString('action', true);
		const status =
			action === 'claim'
				? await executeGrowth(() => growth.claimSeason(interaction.user.id))
				: await executeGrowth(() => growth.seasonalProgress(interaction.user.id));
		const { season: activeSeason, progress } = status;

		return interaction.reply(
			componentReply(
				panel({
					accentColor: status.claimed || action === 'claim' ? color.success : color.RPG,
					title: `${icon.compass} **Season: ${activeSeason.name}**`,
					subtitle: `Limited until <t:${Math.floor(activeSeason.endsAt / 1000)}:D>`,
					sections: [
						[
							`${icon.success} **Victories:** ${progress.victories}/${activeSeason.quest.victories}`,
							`${icon.calendar || icon.clock} **Active Days:** ${progress.activeDays}/${activeSeason.quest.activeDays}`,
							`${icon.loot} **Limited Cosmetic:** ${activeSeason.cosmetic.name}`
						],
						status.claimed || action === 'claim'
							? `${icon.success} The seasonal cosmetic is in your collection.`
							: status.complete
								? `${icon.arrowRight} Quest complete. Claim it with \`/rpg season action:Claim\`.`
								: `${icon.arrowRight} Win encounters and return on multiple days before the season ends.`
					]
				})
			)
		);
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
						`You and the referring Warden unlocked **${result.cosmetic.name}**. Cosmetic rewards do not affect combat power.`,
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
					subtitle: 'Cosmetic-only referral rewards',
					sections: [
						`${icon.info} **Your Code:** \`${player.referralCode}\``,
						`${icon.success} **Successful Referrals:** ${player.referrals}`,
						`${icon.arrowRight} Your friend creates a Warden, then runs \`/rpg refer action:Redeem code:${player.referralCode}\`.`,
						`${icon.loot} Both players unlock **${growth.cosmetics.referral.name}**.`
					]
				}),
				true
			)
		);
	}

	return { leaderboard, refer, season, serverBoss, share };
}

module.exports = { createPlayerGrowthHandlers };
