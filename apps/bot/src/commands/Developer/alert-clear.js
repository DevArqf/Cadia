const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { MessageFlags } = require('discord.js');
const { PermissionLevels } = require('../../lib/types/Enums');
const { buildNoAlertPanel, clearActiveAlert, componentReply } = require('../../lib/util/globalAlerts');
const { panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Clear the active Cadia global alert'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('alert-clear').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const alert = await clearActiveAlert(interaction.user);
		return interaction.editReply(
			componentReply(
				alert
					? panel({
							accentColor: color.success,
							title: `${emojis.custom.success} **Global Alert Cleared**`,
							sections: [`${emojis.custom.arrowright} Users will no longer receive alert prompts.`]
						})
					: buildNoAlertPanel()
			)
		);
	}
}

module.exports = {
	UserCommand
};
