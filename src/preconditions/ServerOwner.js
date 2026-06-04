const { Precondition } = require('@sapphire/framework');
const CadiaCommand = require('../lib/structures/commands/CadiaCommand');

class ServerOwnerPrecondition extends Precondition {
	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		interaction.guild.ownerId === interaction.member.id
			? this.ok()
			: this.error({ message: 'Only the server owner is allowed to run this command', identifier: 'PermissionError' });
	}

	/**
	 * @param {CadiaCommand.ContextMenuCommandInteraction} interaction
	 */
	async contextMenuRun(interaction) {
		interaction.guild.ownerId === interaction.member.id
			? this.ok()
			: this.error({ message: 'Only the server owner is allowed to run this command', identifier: 'PermissionError' });
	}
}

module.exports = {
	ServerOwnerPrecondition
};
