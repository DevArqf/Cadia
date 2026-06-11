const { Listener, Events } = require('@sapphire/framework');
const { postTopggStats } = require('../lib/util/topgg');

class UserEvent extends Listener {
	constructor(context) {
		super(context, {
			event: Events.GuildDelete
		});
	}

	async run(guild) {
		postTopggStats(guild.client).catch((error) => guild.client.logger?.warn?.(error.message));
	}
}

module.exports = {
	UserEvent
};
