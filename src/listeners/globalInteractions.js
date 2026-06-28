const { Events, Listener } = require('@sapphire/framework');
const { MessageFlags } = require('discord.js');
const { hasRestartSafeFallback, registerInteractionHandler, routeComponentInteraction } = require('../lib/runtime/interactionRouter');
const { getRuntimeConfig } = require('../lib/runtime/runtimeConfig');
const { handleAlertInteraction } = require('../lib/util/alertCommandUtils');
const { handleGunfightInteraction } = require('../lib/minigames/custom');
const { handleCalculatorInteraction } = require('../commands/General/calculator');
const { handleBugReportInteraction } = require('../commands/Developer/bug-report');
const { handleDiscoveryInteraction } = require('../commands/Developer/discovery');
const { handleEvalDeleteInteraction } = require('../commands/Developer/eval');
const { handleHelpInteraction } = require('../commands/Miscellaneous/help');
const { handlePingInteraction } = require('../commands/Miscellaneous/ping');
const { handleLoggingInteraction } = require('../commands/Systems/Logging/logging');
const {
	handleRpgBattleInteraction,
	handleRpgComponentInteraction,
	handleRpgLeaderboardInteraction
} = require('../commands/Systems/RPG System/rpg');
const { handlePollInteraction } = require('../commands/Utility/poll');
const { handleMentionDeleteInteraction } = require('./botMention');

registerInteractionHandler('calculator', handleCalculatorInteraction);
registerInteractionHandler('alert', handleAlertInteraction);
registerInteractionHandler('bug', handleBugReportInteraction);
registerInteractionHandler('discovery', handleDiscoveryInteraction);
registerInteractionHandler('eval-delete', handleEvalDeleteInteraction);
registerInteractionHandler('gunfight', handleGunfightInteraction);
registerInteractionHandler('help', handleHelpInteraction);
registerInteractionHandler('ping', handlePingInteraction);
registerInteractionHandler('logging', handleLoggingInteraction);
registerInteractionHandler('poll', handlePollInteraction);
registerInteractionHandler('rpg-bestiary', handleRpgComponentInteraction);
registerInteractionHandler('rpg', handleRpgBattleInteraction);
registerInteractionHandler('rpg-boss', handleRpgBattleInteraction);
registerInteractionHandler('rpg-inventory', handleRpgComponentInteraction);
registerInteractionHandler('rpg-lb', handleRpgLeaderboardInteraction);
registerInteractionHandler('rpg-profile', handleRpgComponentInteraction);
registerInteractionHandler('rpg-quest', handleRpgComponentInteraction);
registerInteractionHandler('rpg-tutorial', handleRpgComponentInteraction);
registerInteractionHandler('rpg-tutorial-offer', handleRpgComponentInteraction);
registerInteractionHandler('mention-delete', handleMentionDeleteInteraction);

class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			event: Events.InteractionCreate
		});
	}

	async run(interaction) {
		const handled = await routeComponentInteraction(interaction, { logger: this.container.logger }).catch((error) => {
			this.container.logger.error(error);
			return replyWithRestartSafeError(interaction);
		});
		if (!handled && hasRestartSafeFallback(interaction.customId)) return replyWithRestartSafeError(interaction);
	}
}

async function replyWithRestartSafeError(interaction) {
	const message = await getRuntimeConfig(
		'messages.restartFallback',
		'That control could not be handled after the restart. Reopen the command and try again.'
	);
	const payload = {
		content: message,
		flags: MessageFlags.Ephemeral
	};
	if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => null);
	return interaction.reply(payload).catch(() => null);
}

module.exports = { UserEvent };
