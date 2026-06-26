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
		return this.checkChatInput(interaction);
	}

	contextMenuRun(interaction) {
		return this.checkGuild(interaction.guildId, interaction.user.id);
	}

	async checkChatInput(interaction) {
		if (shouldAcknowledgeBeforeBlacklistCheck(interaction) && !interaction.deferred && !interaction.replied) {
			await interaction.deferReply();
		}
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

function shouldAcknowledgeBeforeBlacklistCheck(interaction) {
	return interaction.commandName === 'rpg' && interaction.options.getSubcommand(false) === 'season';
}

module.exports = { BlacklistPrecondition, shouldAcknowledgeBeforeBlacklistCheck };
