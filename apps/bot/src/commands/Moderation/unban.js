const { PermissionFlagsBits } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color } = require('../../config/colors');
const { emojis } = require('../../config/emojis');
const { DEFAULT_REASON, createModerationEmbed, reject, runModerationAction, validateModerationTarget } = require('../../lib/moderation/workflow');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['BanMembers'],
			requiredClientPermissions: ['BanMembers'],
			description: 'Unban a user, allowing them to join the server again.'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('unban')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('user').setDescription('The user ID to unban').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for unbanning the user'))
		);
	}

	async chatInputRun(interaction) {
		const userId = interaction.options.getString('user', true).trim();
		const reason = interaction.options.getString('reason') || DEFAULT_REASON;
		if (!/^\d{17,20}$/.test(userId)) {
			return reject(interaction, `${emojis.custom.fail} Enter a valid Discord user ID.`);
		}

		const valid = await validateModerationTarget({
			interaction,
			targetMember: null,
			action: 'unban',
			permission: PermissionFlagsBits.BanMembers,
			allowMissing: true
		});
		if (!valid) return;

		let user = null;
		return runModerationAction({
			interaction,
			logger: this.container.logger,
			errorMessage: 'Cadia could not unban that user. Confirm the ID is currently banned and try again.',
			action: async () => {
				user = await interaction.client.users.fetch(userId).catch(() => null);
				await interaction.guild.bans.remove(userId, `Unbanned by ${interaction.user.tag}: ${reason}`);
			},
			success: () => ({
				embeds: [
					createModerationEmbed({
						target: user?.tag || userId,
						action: 'unbanned',
						reason,
						moderator: interaction.user,
						colorValue: color.success,
						footer: `User Unbanned: ${userId}`
					})
				]
			})
		});
	}
}

module.exports = { UserCommand };
