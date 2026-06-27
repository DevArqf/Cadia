const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color } = require('../../config/colors');
const { emojis } = require('../../config/emojis');
const {
	DEFAULT_REASON,
	createModerationEmbed,
	fetchTargetMember,
	runModerationAction,
	sendDmNotice,
	validateModerationTarget
} = require('../../lib/moderation/workflow');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['KickMembers'],
			requiredClientPermissions: ['KickMembers'],
			description: 'Kick a member from the server'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('kick')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to kick').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for kicking the user'))
		);
	}

	async chatInputRun(interaction) {
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') || DEFAULT_REASON;
		const member = await fetchTargetMember(interaction, user.id);
		const valid = await validateModerationTarget({
			interaction,
			targetMember: member,
			action: 'kick',
			permission: PermissionFlagsBits.KickMembers,
			capability: 'kickable'
		});
		if (!valid) return;

		return runModerationAction({
			interaction,
			logger: this.container.logger,
			errorMessage: "Cadia could not kick that member. Check the bot's role position and Kick Members permission.",
			action: async () => {
				const notice = new EmbedBuilder()
					.setColor(color.fail)
					.setDescription(`${emojis.custom.info} You have been **kicked** from **${interaction.guild.name}**.`)
					.addFields({ name: `${emojis.custom.mail} Reason`, value: reason })
					.setTimestamp();
				await sendDmNotice({ user, payload: { embeds: [notice] }, logger: this.container.logger, action: 'kick' });
				await member.kick(`Kicked by ${interaction.user.tag}: ${reason}`);
			},
			success: {
				embeds: [
					createModerationEmbed({
						target: user.tag,
						action: 'kicked',
						reason,
						moderator: interaction.user,
						footer: `User Kicked: ${user.id}`
					})
				]
			}
		});
	}
}

module.exports = { UserCommand };
