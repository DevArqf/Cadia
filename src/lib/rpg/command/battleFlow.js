function createBattleFlow({
	buildBattleResultReply,
	buildBossBattleReply,
	buildEncounterReply,
	buildExplorationPanel,
	clearActiveAction,
	color,
	componentReply,
	explorationScene,
	getActiveAction,
	icon,
	notice,
	replyActiveAction,
	sendIssue,
	service,
	setActiveAction
}) {
	async function adventure(interaction) {
		const activeAction = getActiveAction(interaction);
		if (activeAction) return replyActiveAction(interaction, activeAction);

		setActiveAction(interaction, 'exploring');
		await interaction.deferReply({ flags: require('discord.js').MessageFlags.IsComponentsV2 });
		let result;
		let battleId;

		try {
			result = await service.startAdventure(interaction.guild.id, interaction.user.id);
			const exploration = explorationScene(result.region.id, result.encounter.name);
			battleId = `rpg:${interaction.id}:${result.encounter.id}`;
			await interaction.editReply({
				...componentReply(buildExplorationPanel(result.profile, result.encounter, result.region, battleId, result.recoveredHp, exploration)),
				files: exploration.attachment ? [exploration.attachment] : []
			});
		} catch (error) {
			clearActiveAction(interaction);
			throw error;
		}

		const responseMessage = await interaction.fetchReply();
		let discovered = false;
		let resolvedFight = false;
		const collector = responseMessage.createMessageComponentCollector({ time: 120_000 });

		collector.on('collect', async (componentInteraction) => {
			if (componentInteraction.user.id !== interaction.user.id) {
				return componentInteraction.reply(
					componentReply(notice(`${icon.forbidden} **Not Your Encounter**`, 'Only the active Warden can resolve this encounter.'), true)
				);
			}

			try {
				if (componentInteraction.customId === `${battleId}:continue`) {
					await componentInteraction.deferUpdate();
					discovered = true;
					setActiveAction(interaction, 'battle');
					return componentInteraction.editReply(await buildEncounterReply(result.profile, result.encounter, result.region, battleId));
				}

				if (!discovered) return;
				await componentInteraction.deferUpdate();
				const stance = componentInteraction.customId.split(':').at(-1);
				const resolved = await service.resolveAdventure(interaction.guild.id, interaction.user.id, result.encounter.id, stance);
				resolvedFight = true;
				collector.stop('resolved');
				return componentInteraction.editReply(buildBattleResultReply(resolved, stance));
			} catch (error) {
				return sendIssue(componentInteraction, error);
			}
		});

		collector.on('end', async () => {
			clearActiveAction(interaction);
			if (resolvedFight) return;
			await interaction
				.editReply({
					components: [
						notice(
							discovered ? `${icon.clock} **Encounter Faded**` : `${icon.clock} **Trail Went Quiet**`,
							discovered
								? `${result.encounter.name} vanished back into ${result.region.name}. Start another adventure when ready.`
								: `${result.region.name} fell silent before the encounter began. Start another adventure when ready.`,
							color.warning
						)
					]
				})
				.catch(() => null);
		});
	}

	async function bossAdventure(interaction, result) {
		const activeAction = getActiveAction(interaction);
		if (activeAction) return replyActiveAction(interaction, activeAction);

		setActiveAction(interaction, 'battle');
		await interaction.deferReply();
		const state = {
			encounterId: result.encounter.id,
			enemyHp: result.encounter.hp,
			playerHp: result.profile.hp,
			turn: 0,
			lastResult: null
		};
		const battleId = `rpg-boss:${interaction.id}:${result.encounter.id}`;
		let responseMessage;

		try {
			responseMessage = await interaction.editReply(
				await buildBossBattleReply(result.profile, result.encounter, result.region, state, battleId)
			);
		} catch (error) {
			clearActiveAction(interaction);
			throw error;
		}

		const collector = responseMessage.createMessageComponentCollector({ time: 180_000 });
		collector.on('collect', async (componentInteraction) => {
			if (componentInteraction.user.id !== interaction.user.id) {
				return componentInteraction.reply(
					componentReply(notice(`${icon.forbidden} **Not Your Boss Fight**`, 'Only the active Warden can fight this boss.'), true)
				);
			}
			if (!componentInteraction.customId.startsWith(battleId)) return;

			try {
				await componentInteraction.deferUpdate();
				const stance = componentInteraction.customId.split(':').at(-1);
				const resolved = await service.resolveAdventureTurn(interaction.guild.id, interaction.user.id, state, stance);
				state.enemyHp = resolved.enemyHp;
				state.playerHp = resolved.playerHp;
				state.turn += 1;
				state.lastResult = { ...resolved, stance };

				if (resolved.done) collector.stop(resolved.won ? 'won' : 'lost');
				if (resolved.done) return componentInteraction.editReply(buildBattleResultReply(resolved, stance));
				return componentInteraction.editReply(
					await buildBossBattleReply(resolved.profile, resolved.encounter, result.region, state, battleId)
				);
			} catch (error) {
				return sendIssue(componentInteraction, error);
			}
		});

		collector.on('end', async (_, reason) => {
			clearActiveAction(interaction);
			if (reason === 'won' || reason === 'lost') return;
			await interaction
				.editReply({
					components: [
						notice(
							`${icon.clock} **Boss Fight Faded**`,
							`${result.encounter.name} vanished into the dungeon dark. Start another adventure when ready.`,
							color.warning
						)
					],
					files: []
				})
				.catch(() => null);
		});
	}

	return {
		adventure,
		bossAdventure
	};
}

module.exports = {
	createBattleFlow
};
