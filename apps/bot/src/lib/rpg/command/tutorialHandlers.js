const { MessageFlags } = require('discord.js');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../runtime/interactionSessions');

function createTutorialHandlers({
	buildTutorialOfferPanel,
	buildTutorialPanel,
	color,
	commandMention,
	componentReply,
	icon,
	notice,
	rpg,
	sendInteractiveRpgReply,
	tutorialSteps
}) {
	async function offerTutorial(interaction) {
		await rpg.markTutorialOffered(interaction.guild.id, interaction.user.id);
		const customIdBase = `rpg-tutorial-offer:${interaction.id}`;
		const message = await sendInteractiveRpgReply(interaction, componentReply(buildTutorialOfferPanel(customIdBase), true));
		if (!message) return;
		await saveInteractionSession({
			kind: 'rpg-tutorial-offer',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guild.id,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: message.id,
			state: {},
			ttlMs: 120_000
		});
	}

	async function runTutorial(interaction, fromComponent = false) {
		await rpg.markTutorialStarted(interaction.guild.id, interaction.user.id);
		const customIdBase = `rpg-tutorial:${interaction.id}`;
		let page = 0;
		const reply = {
			components: [buildTutorialPanel(page, customIdBase)],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		};
		let message;
		if (fromComponent) {
			await interaction.update(reply);
			message = interaction.message;
		} else {
			message = await sendInteractiveRpgReply(interaction, reply);
		}
		if (!message) return;
		await saveInteractionSession({
			kind: 'rpg-tutorial',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guild.id,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: message.id,
			state: { page },
			ttlMs: 240_000
		});
	}

	async function handleTutorialOfferInteraction(interaction, ensureOwner) {
		const [, sessionId, action] = interaction.customId.split(':');
		const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
		const ownerId = session?.ownerId || sessionId;
		if (!(await ensureOwner(interaction, ownerId, 'Not Your Tutorial', `Run ${commandMention('rpg tutorial')} to open your own guide.`))) {
			return true;
		}

		if (action === 'skip') {
			await rpg.markTutorialSkipped(interaction.guild.id, interaction.user.id);
			await interaction.update({
				components: [notice(`${icon.success} **Tutorial Skipped**`, `You can reopen it anytime with ${commandMention('rpg tutorial')}.`, color.success)]
			});
			return true;
		}

		if (action === 'start') return runTutorial(interaction, true).then(() => true);
		return false;
	}

	async function handleTutorialPageInteraction(interaction, ensureOwner) {
		const [, sessionId, action] = interaction.customId.split(':');
		const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
		const ownerId = session?.ownerId || sessionId;
		if (!(await ensureOwner(interaction, ownerId, 'Not Your Tutorial', `Run ${commandMention('rpg tutorial')} to open your own guide.`))) {
			return true;
		}

		let page = Number(session?.state?.page || 0);
		if (action === 'skip') {
			await rpg.markTutorialSkipped(interaction.guild.id, interaction.user.id);
			await interaction.update({
				components: [notice(`${icon.success} **Tutorial Skipped**`, `You can reopen it anytime with ${commandMention('rpg tutorial')}.`, color.success)]
			});
			return true;
		}
		if (action === 'prev') page = Math.max(page - 1, 0);
		if (action === 'next') page = Math.min(page + 1, tutorialSteps.length - 1);
		if (action === 'finish') {
			await rpg.markTutorialCompleted(interaction.guild.id, interaction.user.id);
			await interaction.update({
				components: [
					notice(
						`${icon.success} **Tutorial Complete**`,
						`You are ready to begin. Use ${commandMention('rpg create')}, then ${commandMention('rpg adventure')} when your character is made.`,
						color.success
					)
				]
			});
			return true;
		}

		await updateInteractionSession(session?.sessionId || sessionId, {
			kind: 'rpg-tutorial',
			ownerId,
			guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
			channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
			messageId: interaction.message?.id || session?.messageId || null,
			state: { page },
			ttlMs: 240_000
		});
		await interaction.update({ components: [buildTutorialPanel(page, `rpg-tutorial:${session?.sessionId || sessionId}`)] });
		return true;
	}

	return {
		handleTutorialOfferInteraction,
		handleTutorialPageInteraction,
		offerTutorial,
		runTutorial
	};
}

module.exports = {
	createTutorialHandlers
};
