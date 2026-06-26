const { AllFlowsPrecondition } = require('@sapphire/framework');
const { blacklistMessage, getGuildBlacklist } = require('../lib/policies/blacklist');

class UserPrecondition extends AllFlowsPrecondition {
	constructor(context, options) {
		super(context, {
			...options,
			position: 20
		});
	}

	chatInputRun(interaction) {
		return this.runCheck(interaction.guildId, interaction.user.id);
	}

	contextMenuRun(interaction) {
		return this.runCheck(interaction.guildId, interaction.user.id);
	}

	messageRun(message) {
		return this.runCheck(message.guildId, message.author.id);
	}

	async runCheck(guildId, userId) {
		const blacklistedGuild = await getGuildBlacklist(guildId, userId);
		if (!blacklistedGuild) return this.ok();
		return this.error({ identifier: 'GuildBlacklisted', message: blacklistMessage });
	}
}

module.exports = {
	UserPrecondition
};
