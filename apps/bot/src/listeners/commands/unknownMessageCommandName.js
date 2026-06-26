const { Events, Listener } = require('@sapphire/framework');
const { emojis } = require('../../config');

class UserEvent extends Listener {
	constructor(context, options) {
		super(context, { ...options, event: Events.UnknownMessageCommandName });
	}

	run({ message, commandPrefix }) {
		if (String(commandPrefix).trim().toLowerCase() !== 'cd') return null;
		return message.reply(
			`${emojis.custom.question} Need help using Cadia? Run \`cd help\` to browse every command, or try \`cd rpg tutorial\` to begin.`
		);
	}
}

module.exports = { UserEvent };
