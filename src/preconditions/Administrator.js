const { Precondition } = require('@sapphire/framework');
const CadiaCommand = require('../lib/structures/commands/CadiaCommand');

class AdministratorPrecondition extends Precondition {
	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		interaction.member.permissions.has('Administrator')
			? this.ok()
			: this.error({ message: 'Only admins are allowed to run this command', identifier: 'PermissionError' });
	}

	/**
	 * @param {CadiaCommand.ContextMenuCommandInteraction} interaction
	 */
	async contextMenuRun(interaction) {
		interaction.member.permissions.has('Administrator')
			? this.ok()
			: this.error({ message: 'Only admins are allowed to run this command', identifier: 'PermissionError' });
	}
}

module.exports = {
	AdministratorPrecondition
};
