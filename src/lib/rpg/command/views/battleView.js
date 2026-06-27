const {
	ActionRowBuilder,
	ButtonStyle,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');
const { formatBadge } = require('../../badges');
const { commandMention } = require('../../../util/commandMentions');

function createBattleView({
	actionButton,
	adventureStoryImage,
	badges,
	battleResultImage,
	classes,
	color,
	createBossBattleCard,
	createDefeatStory,
	createEncounterBattleCard,
	fleeResultImage,
	formatItemName,
	hasEncounterBattleCard,
	healthBar,
	icon,
	inventoryQuantity,
	items,
	panel,
	percentage,
	sceneImages,
	service,
	titleCase
}) {
	function buildExplorationPanel(profile, encounter, region, battleId, recoveredHp = 0, exploration) {
		const maxHp = service.getEffectiveMaxHp(profile);
		return panel({
			accentColor: color.RPG,
			title: `${icon.compass} **${region.name} Expedition**`,
			subtitle: `${profile.name} moves deeper into Chapter ${region.chapter}`,
			image: exploration?.image || sceneImages[region.id] || sceneImages.battle,
			sections: [
				exploration?.text || `${profile.name} presses deeper into ${region.name}.`,
				recoveredHp > 0
					? `${icon.health.full} **Recovered:** Camp rest restored **${recoveredHp.toLocaleString()} HP** before the expedition.`
					: `${icon.health.full} **Ready:** HP is full at **${percentage(profile.hp, maxHp)}**.`,
				`${icon.warning} Something is nearby. Continue forward to reveal the encounter.`
			],
			buttons: [actionButton(`${battleId}:continue`, 'Continue', ButtonStyle.Secondary)],
			footer: `${icon.clock} Exploration expires in 2 minutes`
		});
	}

	async function buildEncounterReply(profile, encounter, region, battleId, state) {
		const fileName = `${encounter.id}-battle.png`;
		const enemyHp = state?.enemyHp ?? encounter.hp;
		const playerHp = state?.playerHp ?? profile.hp;
		const attachment = hasEncounterBattleCard(encounter.id)
			? await createEncounterBattleCard({
					encounter,
					enemyHp,
					playerHp,
					playerMaxHp: service.getEffectiveMaxHp(profile),
					playerName: profile.name,
					fileName
				})
			: null;

		return {
			components: [
				buildEncounterPanel(profile, encounter, region, battleId, state, attachment ? `attachment://${fileName}` : sceneImages.battle)
			],
			files: attachment ? [attachment] : [],
			flags: MessageFlags.IsComponentsV2
		};
	}

	function buildEncounterPanel(profile, encounter, region, battleId, state, image = sceneImages.battle) {
		const enemyHp = state?.enemyHp ?? encounter.hp;
		const playerHp = state?.playerHp ?? profile.hp;
		const maxHp = service.getEffectiveMaxHp(profile);
		const last = state?.lastResult;
		const salveCount = inventoryQuantity(profile, 'star_salve');
		const exchange = last
			? [
					`${icon.damageDealt} **Damage Dealt:** ${last.damage}${last.crit ? ' (critical)' : ''}`,
					last.recoveredHp ? `${icon.health.full} **Star Salve:** Restored ${last.recoveredHp} HP before the counterattack.` : null,
					`${icon.damageTaken} **Damage Taken:** ${last.enemyDamage}`,
					last.stance === 'defend'
						? `${icon.info} Your defensive stance reduced the counterattack.`
						: last.stance === 'salve'
							? `${icon.info} Using the salve spent your turn, and ${encounter.name} attacked back.`
							: `${icon.info} ${encounter.name} counterattacked after your ${titleCase(last.stance)} action.`
				].filter(Boolean)
			: `${icon.person} **${profile.name}** found movement beyond the trail. Choose your first action.`;

		return panel({
			accentColor: color.warning,
			title: `${icon.warning} **Encounter: ${encounter.name}**`,
			subtitle: `${region.name} - turn ${state?.turn ?? 0}`,
			image,
			sections: [
				exchange,
				[
					`**${encounter.name}:** ${healthBar(enemyHp, encounter.hp)} ${enemyHp}/${encounter.hp}`,
					`${icon.health.full} **${profile.name}:** ${healthBar(playerHp, maxHp)} ${playerHp}/${maxHp}`,
					`${icon.threat} **Threat:** Attack ${encounter.attack} - Defense ${encounter.defense}`
				],
				`${icon.actions} **Actions**\nEach action spends one turn. If the mob survives, it immediately attacks back. Defend reduces that counterattack.\n${icon.health.full} Star Salve restores **260 HP** before the counterattack. Owned: **${salveCount}**.\n${icon.loot} Loot protection guarantees a drop by every third mob victory.`
			],
			buttons: [
				actionButton(`${battleId}:attack`, 'Attack', ButtonStyle.Danger),
				actionButton(`${battleId}:skill`, classes[profile.classId].skill, ButtonStyle.Primary),
				actionButton(`${battleId}:defend`, 'Defend', ButtonStyle.Secondary),
				actionButton(`${battleId}:flee`, 'Flee', ButtonStyle.Secondary),
				actionButton(`${battleId}:salve`, `Use Salve (${salveCount})`, ButtonStyle.Success).setDisabled(salveCount <= 0 || playerHp >= maxHp)
			],
			footer: `${icon.clock} Encounter expires after 2 minutes of no actions`
		});
	}

	async function buildBossBattleReply(profile, encounter, region, state, battleId, disabled = false) {
		const fileName = `${encounter.id}-battle-${state.turn}.png`;
		const attachment = await createBossBattleCard({
			encounter,
			enemyHp: state.enemyHp,
			playerHp: state.playerHp,
			playerMaxHp: profile.maxHp,
			playerName: profile.name,
			fileName
		});
		return {
			components: [buildBossBattlePanel(profile, encounter, region, state, battleId, fileName, disabled)],
			files: [attachment],
			flags: MessageFlags.IsComponentsV2
		};
	}

	function buildBossBattlePanel(profile, encounter, region, state, battleId, fileName, disabled = false) {
		const last = state.lastResult;
		const maxHp = service.getEffectiveMaxHp(profile);
		const salveCount = inventoryQuantity(profile, 'star_salve');
		const status = last
			? [
					`${icon.threat} **Damage Dealt:** ${last.damage}${last.crit ? ' (critical)' : ''}`,
					last.recoveredHp ? `${icon.health.full} **Star Salve:** Restored ${last.recoveredHp} HP before the counterattack.` : null,
					`${icon.warning} **Damage Taken:** ${last.enemyDamage}`,
					last.done
						? last.won
							? `${icon.success} **${encounter.name} has fallen.**`
							: `${icon.fail} **${profile.name} was forced back.**`
						: `${icon.info} Choose your next stance.`
				].filter(Boolean)
			: [`${icon.warning} **Boss Encounter:** ${encounter.name} blocks the only exit.`, `Fleeing is impossible. Fight until one side breaks.`];

		return new ContainerBuilder()
			.setAccentColor(Number.parseInt((state.enemyHp <= 0 ? color.success : color.RPG).replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${icon.warning} **Boss: ${encounter.name}**\n-# ${region.name} - live combat`)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						...status,
						`${icon.health.full} **${profile.name}:** ${state.playerHp}/${profile.maxHp}`,
						`${icon.threat} **${encounter.name}:** ${state.enemyHp}/${encounter.hp}`
					].join('\n')
				)
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					actionButton(`${battleId}:attack`, 'Attack', ButtonStyle.Danger).setDisabled(disabled),
					actionButton(`${battleId}:skill`, classes[profile.classId].skill, ButtonStyle.Primary).setDisabled(disabled),
					actionButton(`${battleId}:defend`, 'Defend', ButtonStyle.Secondary).setDisabled(disabled),
					actionButton(`${battleId}:salve`, `Use Salve (${salveCount})`, ButtonStyle.Success).setDisabled(
						disabled || salveCount <= 0 || state.playerHp >= maxHp
					)
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`-# Turn ${state.turn} - Boss fight expires after 3 minutes of no actions.`)
			);
	}

	function buildBattleResultReply(result, stance) {
		const image = result.escaped
			? fleeResultImage(result.profile.region)
			: result.won
				? battleResultImage(`${result.encounter.id}-defeat`)
				: null;
		return {
			components: [buildBattleResultPanel(result, stance, image?.url || sceneImages.battle)],
			files: image?.attachment ? [image.attachment] : [],
			flags: MessageFlags.IsComponentsV2
		};
	}

	function buildBattleResultPanel(result, stance, image = sceneImages.battle) {
		if (result.escaped) {
			return panel({
				accentColor: color.warning,
				title: `${icon.compass} **Clean Escape**`,
				subtitle: `${result.encounter.name} lost the trail`,
				image,
				sections: [
					`${icon.info} You withdrew from combat before the relic storm tightened.`,
					`HP remains ${healthBar(result.profile.hp, result.profile.maxHp)} **${percentage(result.profile.hp, result.profile.maxHp)}**.`
				],
				footer: `${icon.clock} Resolved <t:${Math.floor(Date.now() / 1000)}:R>`
			});
		}

		if (!result.won) {
			return panel({
				accentColor: color.fail,
				title: `${icon.fail} **Warden Defeated**`,
				subtitle: `${result.profile.name} fell to ${result.encounter.name}`,
				image,
				sections: [
					createDefeatStory(result),
					[
						`${icon.damageDealt} **Damage Dealt:** ${result.damage}${result.crit ? ' (critical)' : ''}`,
						`${icon.damageTaken} **Final Blow:** ${result.enemyDamage} damage`,
						`${icon.health.full} **HP Remaining:** 1`,
						`${icon.info} **Rewards:** None`
					]
				],
				footer: `${icon.clock} Defeated <t:${Math.floor(Date.now() / 1000)}:R>`
			});
		}

		return panel({
			accentColor: color.success,
			title: `${icon.success} **Encounter Cleared**`,
			subtitle: `${result.encounter.name} - ${titleCase(stance)} stance`,
			image,
			sections: [
				[
					`${icon.damageDealt} **Damage Dealt:** ${result.damage}${result.crit ? ' (critical)' : ''}`,
					`${icon.damageTaken} **Damage Taken:** ${result.enemyDamage}`,
					`**HP:** ${healthBar(result.profile.hp, result.profile.maxHp)} ${percentage(result.profile.hp, result.profile.maxHp)}`
				],
				[
					`${icon.coin} **Gold:** +${result.gold}`,
					`${icon.xpLabel} **XP:** +${result.xp}`,
					`${icon.loot} **Loot:** ${result.loot ? formatItemName(items[result.loot]) : 'None'}`,
					result.unlockedAchievements?.length
						? formatAchievementUnlock(result.unlockedAchievements.at(-1), result.achievementRewards)
						: null
				].filter(Boolean)
			],
			footer: `${icon.clock} Resolved <t:${Math.floor(Date.now() / 1000)}:R>`
		});
	}

	function formatAchievementUnlock(achievement, rewardSummary) {
		const badge = badges[achievement.badgeId];
		const rewards = [];
		if (rewardSummary?.gold) rewards.push(`${icon.coin} **${rewardSummary.gold.toLocaleString()} Gold**`);
		if (rewardSummary?.shards) rewards.push(`${icon.shards} **${rewardSummary.shards.toLocaleString()} Relic Shards**`);
		if (badge) rewards.push(formatBadge(badge));
		return (
			`**Achievement Unlocked: ${achievement.name}**` +
			(rewards.length ? `\n**Rewards**\n${rewards.join('\n')}` : '') +
			`\n-# Feature its badge on your profile with ${commandMention('rpg badge')}.`
		);
	}

	function explorationScene(regionId, encounterName) {
		const scenes = {
			'broken-gate': [
				[
					'broken-gate-gatehouse-corridor',
					'The cracked gatehouse groans above you as dust slips from the old stone. Your boots cross a corridor of broken doors, cold lanterns, and claw marks that look fresh.'
				],
				[
					'broken-gate-market-arch',
					'You pass through a collapsed market arch where torn banners scrape against iron railings. Somewhere deeper in the ruin, a loose tile clicks under something that is not you.'
				],
				[
					'broken-gate-black-brick-street',
					'The street narrows between abandoned black-brick homes. A window shutter taps once, then twice, and the relic storm pulls the air tight around your armor.'
				]
			],
			'ashwood-outskirts': [
				[
					'ashwood-black-snow-trail',
					'Ash leaves drift across the trail like black snow. The forest bends around you, every root curling away as if it knows where the next ambush waits.'
				],
				[
					'ashwood-watch-post',
					'You push through a half-buried watch post wrapped in living vines. Sap glows along the walls, and the brush ahead starts moving against the wind.'
				],
				[
					'ashwood-hunter-camp',
					'A ruined hunter camp sits under orange moss. The firepit is warm, the tracks are fresh, and something heavy snaps a branch beyond the trees.'
				]
			],
			'glassmine-depths': [
				[
					'glassmine-reflection-wall',
					'Your lantern catches a thousand reflections in the mine wall. Each step answers back a second late, until one echo keeps walking after you stop.'
				],
				[
					'glassmine-crystal-bridge',
					'You cross a bridge of pale crystal above a silent drop. Far below, a pickaxe rings against stone even though no miner is there.'
				],
				[
					'glassmine-broken-carts',
					'The tunnel opens into a chamber of broken carts and blue glass dust. The shards tremble first, then the dark between them begins to move.'
				]
			]
		};
		const [assetId, text] = (scenes[regionId] || scenes['broken-gate'])[
			Math.floor(Math.random() * (scenes[regionId] || scenes['broken-gate']).length)
		];
		const image = adventureStoryImage(assetId);
		return { attachment: image?.attachment, image: image?.url, text: `${text}\n\n${icon.threat} **Encounter Stirring:** ${encounterName}` };
	}

	return {
		buildBattleResultPanel,
		buildBattleResultReply,
		buildBossBattlePanel,
		buildBossBattleReply,
		buildEncounterPanel,
		buildEncounterReply,
		buildExplorationPanel,
		explorationScene
	};
}

module.exports = { createBattleView };
