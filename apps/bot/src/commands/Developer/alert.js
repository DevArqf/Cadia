const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { MessageFlags } = require('discord.js');
const { buildAlertPanel, buildNoAlertPanel, componentReply, getActiveAlert, markAlertViewed } = require('../../lib/util/globalAlerts');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'View the latest Cadia developer alert'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('alert').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const alert = await getActiveAlert({ fresh: true });
		if (alert) await markAlertViewed(alert, interaction.user.id);
		return interaction.editReply(componentReply(alert ? buildAlertPanel(alert, { viewer: true }) : buildNoAlertPanel()));
	}
}

module.exports = {
	UserCommand
};
