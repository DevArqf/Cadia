const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../runtime/interactionSessions');

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
		const state = {
			type: 'adventure',
			encounterId: result.encounter.id,
			enemyHp: result.encounter.hp,
			playerHp: result.profile.hp,
			turn: 0,
			lastResult: null,
			discovered: false,
			profile: result.profile,
			encounter: result.encounter,
			region: result.region,
			battleId
		};
		await saveInteractionSession({
			kind: 'rpg-battle',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guild.id,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: responseMessage?.id || null,
			state,
			ttlMs: 120_000
		});
	}

	async function bossAdventure(interaction, result) {
		const activeAction = getActiveAction(interaction);
		if (activeAction) return replyActiveAction(interaction, activeAction);

		setActiveAction(interaction, 'battle');
		await interaction.deferReply();
		const battleId = `rpg-boss:${interaction.id}:${result.encounter.id}`;
		const state = {
			type: 'boss',
			encounterId: result.encounter.id,
			enemyHp: result.encounter.hp,
			playerHp: result.profile.hp,
			turn: 0,
			lastResult: null,
			profile: result.profile,
			encounter: result.encounter,
			region: result.region,
			battleId
		};
		let responseMessage;

		try {
			responseMessage = await interaction.editReply(
				await buildBossBattleReply(result.profile, result.encounter, result.region, state, battleId)
			);
		} catch (error) {
			clearActiveAction(interaction);
			throw error;
		}

		await saveInteractionSession({
			kind: 'rpg-boss-battle',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guild.id,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: responseMessage?.id || null,
			state,
			ttlMs: 180_000
		});
	}

	async function handleBattleInteraction(componentInteraction) {
		const customId = componentInteraction.customId || '';
		if (!customId.startsWith('rpg:') && !customId.startsWith('rpg-boss:')) return false;

		const parts = customId.split(':');
		const isBoss = parts[0] === 'rpg-boss';
		const sessionId = parts[1];
		const session = await getInteractionSession({ sessionId, messageId: componentInteraction.message?.id });
		if (!session) {
			await componentInteraction.reply(
				componentReply(notice(`${icon.clock} **Battle Expired**`, 'Start a new RPG adventure to continue fighting.'), true)
			);
			return true;
		}
		if (componentInteraction.user.id !== session.ownerId) {
			await componentInteraction.reply(
				componentReply(
					notice(
						`${icon.forbidden} **${isBoss ? 'Not Your Boss Fight' : 'Not Your Encounter'}**`,
						`Only the active Warden can ${isBoss ? 'fight this boss' : 'resolve this encounter'}.`
					),
					true
				)
			);
			return true;
		}

		const state = { ...(session.state || {}) };
		const battleId = state.battleId || `${parts[0]}:${sessionId}:${parts[2]}`;
		try {
			if (!isBoss && customId === `${battleId}:continue`) {
				await componentInteraction.deferUpdate();
				state.discovered = true;
				setActiveAction(componentInteraction, 'battle');
				await updateBattleSession(componentInteraction, session, state, isBoss);
				await componentInteraction.editReply(await buildEncounterReply(state.profile, state.encounter, state.region, battleId, state));
				return true;
			}

			if (!isBoss && !state.discovered) return true;
			await componentInteraction.deferUpdate();
			const stance = parts.at(-1);
			const resolved = await service.resolveAdventureTurn(componentInteraction.guild.id, componentInteraction.user.id, state, stance);
			state.enemyHp = resolved.enemyHp;
			state.playerHp = resolved.playerHp;
			state.turn = (state.turn || 0) + 1;
			state.lastResult = { ...resolved, stance };
			state.profile = resolved.profile;
			state.encounter = resolved.encounter;

			if (resolved.done) {
				clearActiveAction(componentInteraction);
				await updateBattleSession(componentInteraction, session, state, isBoss, 1);
				await componentInteraction.editReply(buildBattleResultReply(resolved, stance));
				return true;
			}

			await updateBattleSession(componentInteraction, session, state, isBoss);
			if (isBoss) {
				await componentInteraction.editReply(await buildBossBattleReply(resolved.profile, resolved.encounter, state.region, state, battleId));
			} else {
				await componentInteraction.editReply(await buildEncounterReply(resolved.profile, resolved.encounter, state.region, battleId, state));
			}
			return true;
		} catch (error) {
			await sendIssue(componentInteraction, error);
			return true;
		}
	}

	async function updateBattleSession(interaction, session, state, isBoss, ttlMs) {
		await updateInteractionSession(session.sessionId, {
			kind: isBoss ? 'rpg-boss-battle' : 'rpg-battle',
			ownerId: session.ownerId,
			guildId: interaction.guildId || interaction.guild?.id || session.guildId || null,
			channelId: interaction.channelId || interaction.channel?.id || session.channelId || null,
			messageId: interaction.message?.id || session.messageId || null,
			state,
			ttlMs: ttlMs || (isBoss ? 180_000 : 120_000)
		});
	}

	return {
		adventure,
		bossAdventure,
		handleBattleInteraction
	};
}

module.exports = {
	createBattleFlow
};
