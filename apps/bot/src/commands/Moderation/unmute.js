const { PermissionFlagsBits } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const {
	DEFAULT_REASON,
	createModerationEmbed,
	fetchTargetMember,
	reject,
	runModerationAction,
	validateModerationTarget
} = require('../../lib/moderation/workflow');
const { emojis } = require('../../config/emojis');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['ModerateMembers'],
			requiredClientPermissions: ['ModerateMembers'],
			description: 'Unmute a user within the server, allowing them to speak again.'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('unmute')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to unmute').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for the unmute'))
		);
	}

	async chatInputRun(interaction) {
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || DEFAULT_REASON;
		const member = await fetchTargetMember(interaction, user.id);
		const valid = await validateModerationTarget({
			interaction,
			targetMember: member,
			action: 'unmute',
			permission: PermissionFlagsBits.ModerateMembers,
			capability: 'moderatable'
		});
		if (!valid) return;
		if (!member.isCommunicationDisabled()) return reject(interaction, `${emojis.custom.fail} This user is not currently muted.`);

		return runModerationAction({
			interaction,
			logger: this.container.logger,
			errorMessage: "Cadia could not unmute that member. Check the bot's role position and Moderate Members permission.",
			action: () => member.timeout(null, reason),
			success: {
				embeds: [
					createModerationEmbed({
						target: user.tag,
						action: 'unmuted',
						reason,
						moderator: interaction.user,
						footer: `User Unmuted: ${user.id}`
					})
				]
			}
		});
	}
}

module.exports = { UserCommand };
