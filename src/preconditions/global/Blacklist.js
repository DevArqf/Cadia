const { Precondition } = require('@sapphire/framework');
const { blacklistMessage, getGuildBlacklist } = require('../../lib/policies/blacklist');

class BlacklistPrecondition extends Precondition {
	constructor(context, options) {
		super(context, {
			...options,
			name: 'Blacklist',
			position: 1
		});
	}

	messageRun(message) {
		return this.checkGuild(message.guildId, message.author.id);
	}

	chatInputRun(interaction) {
		return this.checkGuild(interaction.guildId, interaction.user.id);
	}

	contextMenuRun(interaction) {
		return this.checkGuild(interaction.guildId, interaction.user.id);
	}

	async checkGuild(guildId, userId) {
		const blacklistedGuild = await getGuildBlacklist(guildId, userId);
		if (!blacklistedGuild) return this.ok();

		return this.error({
			identifier: 'GuildBlacklisted',
			message: blacklistMessage
		});
	}
}

module.exports = { BlacklistPrecondition };
