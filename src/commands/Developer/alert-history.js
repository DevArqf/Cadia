const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { MessageFlags } = require('discord.js');
const { PermissionLevels } = require('../../lib/types/Enums');
const { componentReply, getAlertHistory } = require('../../lib/util/globalAlerts');
const { panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'List recent Cadia global alert IDs'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('alert-history')
				.setDescription(this.description)
				.addIntegerOption((option) =>
					option.setName('limit').setDescription('How many recent alerts to show').setMinValue(1).setMaxValue(20).setRequired(false)
				)
		);
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const limit = interaction.options.getInteger('limit') ?? 12;
		const alerts = await getAlertHistory(limit);
		return interaction.editReply(
			componentReply(
				panel({
					accentColor: color.default,
					title: `${emojis.custom.openfolder} **Alert History**`,
					subtitle: 'Recent Cadia global alerts',
					sections: [formatAlertHistory(alerts)],
					footer: `${emojis.custom.arrowright} Use /alert-preview alert-id:<id> to preview a past alert.`
				})
			)
		);
	}
}

function formatAlertHistory(alerts) {
	if (!alerts.length) return `${emojis.custom.warning} No alerts have been published yet.`;

	return alerts
		.map((alert, index) => {
			const title = alert.title || 'Cadia Global Alert';
			const status = alert.active ? 'Active' : 'Archived';
			const published = alert.createdAt ? `<t:${Math.floor(alert.createdAt / 1000)}:R>` : 'Unknown';
			return [
				`**${index + 1}. ${title}**`,
				`${emojis.custom.info} ID: \`${alert.alertId}\``,
				`${emojis.custom.settings} ${status} | ${published}`
			].join('\n');
		})
		.join('\n\n');
}

module.exports = {
	UserCommand
};
