const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Shutdown Cadia'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('shutdown').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		try {
			await interaction.reply(
				componentReply(
					panel({
						accentColor: color.fail,
						title: `${emojis.custom.disconnected} **Shutdown Queued**`,
						subtitle: 'Owner runtime control',
						sections: [`${emojis.custom.warning} Cadia is going invisible and stopping the process.`],
						footer: `${emojis.custom.person} Requested by ${interaction.user.displayName}`
					}),
					true
				)
			);
			await interaction.client.user.setStatus('invisible');
			process.exit();
		} catch (error) {
			console.error(error);
			return interaction.reply(
				componentReply(notice(`${emojis.custom.fail} **Shutdown Failed**`, 'The shutdown request could not be completed.'), true)
			);
		}
	}
}

module.exports = {
	UserCommand
};
