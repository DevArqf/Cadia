const { Listener } = require('@sapphire/framework');
const { emojis } = require('../../config');

class UserEvent extends Listener {
	/**
	 * Handles the user event.
	 * @param {UserError} error - The error object.
	 * @param {import('@sapphire/framework').MessageCommandDeniedPayload} payload - The payload object.
	 * @returns {Promise<void>} - A promise that resolves when the event is handled.
	 */
	async run(error, payload) {
		const { context, message: content, identifier } = error;
		const { message } = payload;

		// `context: { silent: true }` should make UserError silent:
		// Use cases for this are for example permissions error when running the `eval` command.
		if (Reflect.get(Object(context), 'silent')) return;

		this.container.logger.debug(`Message command denied: ${identifier}`);

		if (identifier === 'PermissionError') {
			return message.reply({
				content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command`
			});
		}

		if (identifier === 'DevOnlyCommand') {
			return message.reply({
				content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command`
			});
		}

		return message.reply({
			content: `${content ?? 'An error occurred while executing the command.'}`,
			allowedMentions: { users: [message.author.id], roles: [] }
		});
	}
}

module.exports = {
	UserEvent
};
