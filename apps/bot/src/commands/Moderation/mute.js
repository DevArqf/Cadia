const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color } = require('../../config/colors');
const { emojis } = require('../../config/emojis');
const {
	DEFAULT_REASON,
	createModerationEmbed,
	fetchTargetMember,
	parseTimeoutDuration,
	reject,
	runModerationAction,
	sendDmNotice,
	validateModerationTarget
} = require('../../lib/moderation/workflow');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['ModerateMembers'],
			requiredClientPermissions: ['ModerateMembers'],
			description: 'Mute a user within the server, revoking their permission to speak.'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('mute')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to mute').setRequired(true))
				.addStringOption((option) => option.setName('time').setDescription('Duration such as 15m, 2h, or 1d').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for the mute'))
		);
	}

	async chatInputRun(interaction) {
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || DEFAULT_REASON;
		let duration;
		try {
			duration = parseTimeoutDuration(interaction.options.getString('time'));
		} catch (error) {
			return reject(interaction, `${emojis.custom.fail} ${error.message}`);
		}

		const member = await fetchTargetMember(interaction, user.id);
		const valid = await validateModerationTarget({
			interaction,
			targetMember: member,
			action: 'mute',
			permission: PermissionFlagsBits.ModerateMembers,
			capability: 'moderatable'
		});
		if (!valid) return;
		if (member.isCommunicationDisabled()) return reject(interaction, `${emojis.custom.fail} This user is already muted.`);

		return runModerationAction({
			interaction,
			logger: this.container.logger,
			errorMessage: "Cadia could not mute that member. Check the bot's role position and Moderate Members permission.",
			action: async () => {
				const notice = new EmbedBuilder()
					.setColor(color.fail)
					.setDescription(`${emojis.custom.info} You have been **muted** in **${interaction.guild.name}**.`)
					.addFields({ name: `${emojis.custom.mail} Reason`, value: reason })
					.setTimestamp();
				await sendDmNotice({ user, payload: { embeds: [notice] }, logger: this.container.logger, action: 'mute' });
				await member.timeout(duration, reason);
			},
			success: {
				embeds: [
					createModerationEmbed({
						target: user.tag,
						action: 'muted',
						reason,
						moderator: interaction.user,
						footer: `User Muted: ${user.id}`
					})
				]
			}
		});
	}
}

module.exports = { UserCommand };
