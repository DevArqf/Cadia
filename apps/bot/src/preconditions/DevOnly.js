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
		return this.isDeveloper(message.member.user.id) ? this.ok() : this.error({ context: { silent: false }, identifier: 'DevOnlyCommand' });
	}

	/**
	 * @param {ChatInputCommandInteraction<'cached'>} interaction
	 * @returns {import('@sapphire/framework').PreconditionResult}
	 */
	chatInputRun(interaction) {
		return this.isDeveloper(interaction.member.user.id) ? this.ok() : this.error({ context: { silent: false }, identifier: 'DevOnlyCommand' });
	}

	/**
	 * @param {import('../lib/types/Discord').GuildContextMenuInteraction} interaction
	 * @returns {import('@sapphire/framework').PreconditionResult}
	 */
	contextMenuRun(interaction) {
		return this.isDeveloper(interaction.member.user.id) ? this.ok() : this.error({ context: { silent: false }, identifier: 'DevOnlyCommand' });
	}

	/**
	 *
	 * @param {import('discord.js').Snowflake} userId The id of the user you want to check
	 */
	isDeveloper(userId) {
		const devs = envParseArray('DEVELOPERS');
		const isDev = devs.includes(userId);
		return isDev;
	}
}

module.exports = { BotOwnerPrecondition };
