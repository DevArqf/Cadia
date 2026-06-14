const { Listener, UserError, ChatInputCommandDeniedPayload } = require('@sapphire/framework');
const { MessageFlags } = require('discord.js');
const { emojis } = require('../../config');
const { recordCommandDenied } = require('../../lib/util/botAnalytics');

class UserEvent extends Listener {
	/**
	 * Handles the user event.
	 * @param {UserError} error - The error object.
	 * @param {ChatInputCommandDeniedPayload} payload - The payload object.
	 * @returns {Promise<void>} - A promise that resolves when the event is handled.
	 */
	async run(error, payload) {
		const { context, message: content, identifier } = error;
		const { interaction } = payload;

		// `context: { silent: true }` should make UserError silent:
		// Use cases for this are for example permissions error when running the `eval` command.
		if (Reflect.get(Object(context), 'silent')) return;

		await recordCommandDenied({
			client: interaction.client,
			interaction,
			commandName: interaction.commandName
		});

		if (interaction.deferred || interaction.replied) {
			if (identifier === 'PermissionError') {
				return interaction.editReply({
					content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command`,
					flags: MessageFlags.Ephemeral
				});
			}
		}

		if (identifier === 'PermissionError') {
			return interaction.reply({
				content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (identifier === 'DevOnlyCommand') {
			return interaction.reply({
				content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command`,
				flags: MessageFlags.Ephemeral
			});
		}

		return interaction.reply({
			content: `${content ?? 'An error occurred while executing the command.'}`,
			allowedMentions: { users: [interaction.user.id], roles: [] },
			flags: MessageFlags.Ephemeral
		});
	}
}

module.exports = UserEvent;
