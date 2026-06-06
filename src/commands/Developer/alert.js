const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { MessageFlags } = require('discord.js');
const {
	buildAlertPanel,
	buildNoAlertPanel,
	clearActiveAlert,
	componentReply,
	getActiveAlert,
	isDeveloper,
	publishAlert,
	updateAlertDmStats
} = require('../../lib/util/globalAlerts');
const { notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'View or publish a Cadia global alert'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('alert')
				.setDescription(this.description)
				.addStringOption((option) =>
					option.setName('message').setDescription('Developer only: publish a new global alert').setMaxLength(1800).setRequired(false)
				)
				.addBooleanOption((option) =>
					option.setName('clear').setDescription('Developer only: clear the active global alert').setRequired(false)
				)
		);
	}

	async chatInputRun(interaction) {
		const message = interaction.options.getString('message')?.trim();
		const clear = interaction.options.getBoolean('clear') ?? false;

		if (message || clear) {
			if (!isDeveloper(interaction.user.id)) {
				return interaction.reply(
					componentReply(
						notice(`${emojis.custom.forbidden} **Developer Only**`, 'Only Cadia developers can publish or clear global alerts.')
					)
				);
			}
		}

		if (clear) return this.clearAlert(interaction);
		if (message === '') {
			return interaction.reply(componentReply(notice(`${emojis.custom.warning} **Empty Alert**`, 'The alert message cannot be empty.')));
		}
		if (message) return this.publishAlert(interaction, message);

		const alert = await getActiveAlert({ fresh: true });
		return interaction.reply(componentReply(alert ? buildAlertPanel(alert, { viewer: true }) : buildNoAlertPanel()));
	}

	async publishAlert(interaction, message) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const alert = await publishAlert({ message, developer: interaction.user });
		const stats = await sendOwnerDms(interaction.client, alert);
		await updateAlertDmStats(alert, stats);

		return interaction.editReply(
			componentReply(
				panel({
					accentColor: color.success,
					title: `${emojis.custom.success} **Global Alert Published**`,
					subtitle: 'Server owner DM broadcast complete',
					sections: [
						`${emojis.custom.mail} **Owner DMs Sent:** ${stats.sent}`,
						`${emojis.custom.warning} **Owner DMs Failed:** ${stats.failed}`,
						`${emojis.custom.community} **Unique Owners:** ${stats.total}`
					],
					footer: `${emojis.custom.arrowright} Users will be prompted to run /alert after using Cadia commands.`
				})
			)
		);
	}

	async clearAlert(interaction) {
		const alert = await clearActiveAlert(interaction.user);
		return interaction.reply(
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

async function sendOwnerDms(client, alert) {
	const ownerIds = new Set(client.guilds.cache.map((guild) => guild.ownerId).filter(Boolean));
	const stats = { sent: 0, failed: 0, total: ownerIds.size };

	for (const ownerId of ownerIds) {
		const owner = await client.users.fetch(ownerId).catch(() => null);
		if (!owner) {
			stats.failed += 1;
			continue;
		}

		const sent = await owner.send({ components: [buildAlertPanel(alert)], flags: MessageFlags.IsComponentsV2 }).then(
			() => true,
			() => false
		);
		if (sent) stats.sent += 1;
		else stats.failed += 1;
	}

	return stats;
}

module.exports = {
	UserCommand
};
