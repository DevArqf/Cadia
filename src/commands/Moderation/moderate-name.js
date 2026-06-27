const { PermissionFlagsBits } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const {
	DEFAULT_REASON,
	createModerationEmbed,
	fetchTargetMember,
	runModerationAction,
	validateModerationTarget
} = require('../../lib/moderation/workflow');
const { emojis } = require('../../config/emojis');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['ManageNicknames'],
			requiredClientPermissions: ['ManageNicknames'],
			description: "Moderate a user's inappropriate name"
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('moderate-name')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to moderate').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for moderating the name'))
		);
	}

	async chatInputRun(interaction) {
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || DEFAULT_REASON;
		const member = await fetchTargetMember(interaction, user.id);
		const valid = await validateModerationTarget({
			interaction,
			targetMember: member,
			action: 'moderate the name of',
			permission: PermissionFlagsBits.ManageNicknames,
			capability: 'manageable'
		});
		if (!valid) return;

		const nickname = `Moderated Name ${Math.floor(Math.random() * 9000) + 1000}`;
		return runModerationAction({
			interaction,
			logger: this.container.logger,
			errorMessage: "Cadia could not moderate that member's name. Check the bot's role position and Manage Nicknames permission.",
			action: () => member.setNickname(nickname, reason),
			success: {
				embeds: [
					createModerationEmbed({
						target: user.tag,
						action: 'name moderated',
						reason,
						moderator: interaction.user,
						footer: `User Moderated: ${user.id}`,
						fields: [{ name: `${emojis.custom.pencil} New Nickname`, value: nickname }]
					})
				]
			}
		});
	}
}

module.exports = { UserCommand };
