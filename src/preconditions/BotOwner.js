const { Precondition } = require('@sapphire/framework');
const { GuildMessage } = require('../lib/types/Discord');
const { ChatInputCommandInteraction } = require('discord.js');
const { envParseArray } = require('@skyra/env-utilities');

/**
 * @class
 * @extends {Precondition}
 */
class BotOwnerPrecondition extends Precondition {
	/**
	 * @param {GuildMessage} message
	 * @returns {import('@sapphire/framework').PreconditionResult}
	 */
	messageRun(message) {
		return this.isOwner(message.member.user.id) ? this.ok() : this.error({ context: { silent: false }, identifier: 'PermissionError' });
	}

	/**
	 * @param {ChatInputCommandInteraction<'cached'>} interaction
	 * @returns {import('@sapphire/framework').PreconditionResult}
	 */
	chatInputRun(interaction) {
		return this.isOwner(interaction.member.user.id) ? this.ok() : this.error({ context: { silent: false }, identifier: 'PermissionError' });
	}

	/**
	 * @param {import('../lib/types/Discord').GuildContextMenuInteraction} interaction
	 * @returns {import('@sapphire/framework').PreconditionResult}
	 */
	contextMenuRun(interaction) {
		return this.isOwner(interaction.member.user.id) ? this.ok() : this.error({ context: { silent: false }, identifier: 'PermissionError' });
	}

	/**
	 *
	 * @param {import('discord.js').Snowflake} userId The id of the user you want to check
	 */
	isOwner(userId) {
		const owners = envParseArray('BOT_OWNERS');
		const isOwner = owners.includes(userId);
		return isOwner;
	}
}

module.exports = { BotOwnerPrecondition };
