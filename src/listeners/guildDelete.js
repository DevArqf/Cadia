const { Listener, Events } = require('@sapphire/framework');
const { recordGuildLeave } = require('../lib/util/botAnalytics');
const { postTopggStats } = require('../lib/util/topgg');

class UserEvent extends Listener {
	constructor(context) {
		super(context, {
			event: Events.GuildDelete
		});
	}

	async run(guild) {
		await recordGuildLeave(guild);
		postTopggStats(guild.client).catch((error) => guild.client.logger?.warn?.(error.message));
	}
}

module.exports = {
	UserEvent
};
