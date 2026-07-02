const { Events, Listener } = require('@sapphire/framework');
const { emojis } = require('../../config');

class UserEvent extends Listener {
	constructor(context, options) {
		super(context, { ...options, event: Events.UnknownMessageCommandName });
	}

	run({ message, commandPrefix }) {
		const prefix = String(commandPrefix || 'cd ');
		return message.reply(
			`${emojis.custom.question} Need help using Cadia? Run \`${prefix}help\` to browse every command, or try \`${prefix}rpg tutorial\` to begin.`
		);
	}
}

module.exports = { UserEvent };
