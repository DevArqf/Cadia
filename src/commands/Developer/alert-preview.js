const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { MessageFlags } = require('discord.js');
const { PermissionLevels } = require('../../lib/types/Enums');
const { buildAlertPanel, componentReply, getAlertById } = require('../../lib/util/globalAlerts');
const { notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Preview a past Cadia global alert by ID'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('alert-preview')
				.setDescription(this.description)
				.addStringOption((option) =>
					option.setName('alert-id').setDescription('Alert ID from /alert-history').setMaxLength(80).setRequired(true)
				)
		);
	}

	async chatInputRun(interaction) {
		const alertId = interaction.options.getString('alert-id', true).trim();
		const alert = await getAlertById(alertId);

		if (!alert) {
			return interaction.reply(
				componentReply(notice(`${emojis.custom.warning} **Alert Not Found**`, `No alert exists with ID \`${alertId}\`.`))
			);
		}

		return interaction.reply({
			components: [
				buildAlertPanel(alert, { viewer: true, showId: true }),
				panel({
					accentColor: color.default,
					title: `${emojis.custom.info} **Past Alert Preview**`,
					sections: [
						`${emojis.custom.settings} **Status:** ${alert.active ? 'Active' : 'Archived'}`,
						`${emojis.custom.mail} **DM Stats:** ${alert.dmSent ?? 0} sent, ${alert.dmFailed ?? 0} failed, ${alert.dmTargeted ?? 0} targeted`
					]
				})
			],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}
}

module.exports = {
	UserCommand
};
