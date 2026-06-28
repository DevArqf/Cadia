const { Precondition } = require('@sapphire/framework');
const CadiaCommand = require('../lib/structures/commands/CadiaCommand');

class ModeratorPrecondition extends Precondition {
	messageRun(message) {
		return message.member.permissions.has('ManageGuild')
			? this.ok()
			: this.error({ message: 'Only moderators are allowed to run this command', identifier: 'PermissionError' });
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		interaction.member.permissions.has('ManageGuild')
			? this.ok()
			: this.error({ message: 'Only moderators are allowed to run this command', identifier: 'PermissionError' });
	}

	/**
	 * @param {CadiaCommand.ContextMenuCommandInteraction} interaction
	 */
	async contextMenuRun(interaction) {
		interaction.member.permissions.has('ManageGuild')
			? this.ok()
			: this.error({ message: 'Only moderators are allowed to run this command', identifier: 'PermissionError' });
	}
}

module.exports = {
	ModeratorPrecondition
};
