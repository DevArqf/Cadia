const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color } = require('../../config/colors');
const { emojis } = require('../../config/emojis');
const {
	DEFAULT_REASON,
	createModerationEmbed,
	fetchTargetMember,
	reject,
	runModerationAction,
	sendDmNotice,
	validateModerationTarget
} = require('../../lib/moderation/workflow');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['BanMembers'],
			requiredClientPermissions: ['BanMembers'],
			description: 'Ban a user from the server, revoking access for them to join again.'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('ban')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to ban'))
				.addStringOption((option) => option.setName('userid').setDescription('The ID of the user to ban'))
				.addStringOption((option) => option.setName('reason').setDescription('The reason for banning the user'))
				.addStringOption((option) => option.setName('evidence-link').setDescription('Discord message link containing evidence'))
				.addAttachmentOption((option) => option.setName('evidence').setDescription('Attach image evidence related to the ban'))
		);
	}

	async chatInputRun(interaction) {
		const selectedUser = interaction.options.getUser('user');
		const enteredUserId = interaction.options.getString('userid');
		const targetId = selectedUser?.id || enteredUserId;
		const reason = interaction.options.getString('reason') || DEFAULT_REASON;
		const evidence = interaction.options.getAttachment('evidence');
		const evidenceLinkInput = interaction.options.getString('evidence-link');
		const evidenceLink = evidenceLinkInput ? normalizeEvidenceMessageLink(evidenceLinkInput, interaction.guildId) : null;

		if (!targetId) return reject(interaction, `${emojis.custom.fail} Select a user or provide a user ID.`);
		if (selectedUser && enteredUserId && selectedUser.id !== enteredUserId) {
			return reject(interaction, `${emojis.custom.fail} Select a user or provide one matching user ID.`);
		}
		if (!/^\d{17,20}$/.test(targetId)) return reject(interaction, `${emojis.custom.fail} Enter a valid Discord user ID.`);
		if (evidenceLinkInput && !evidenceLink) {
			return reject(interaction, `${emojis.custom.fail} Evidence must be a message link from this server.`);
		}

		const targetMember = await fetchTargetMember(interaction, targetId);
		const valid = await validateModerationTarget({
			interaction,
			targetMember,
			action: 'ban',
			permission: PermissionFlagsBits.BanMembers,
			capability: 'bannable',
			allowMissing: true
		});
		if (!valid) return;

		const targetUser = selectedUser || targetMember?.user || (await interaction.client.users.fetch(targetId).catch(() => null));
		return runModerationAction({
			interaction,
			logger: this.container.logger,
			errorMessage: "Cadia could not ban that user. Check the bot's role position and Ban Members permission.",
			action: async () => {
				if (targetUser) {
					const notice = new EmbedBuilder()
						.setColor(color.fail)
						.setDescription(`${emojis.custom.info} You have been **banned** from **${interaction.guild.name}**.`)
						.addFields(
							{ name: `${emojis.custom.mail} Reason`, value: reason },
							{ name: `${emojis.custom.person} Moderator`, value: interaction.user.toString() },
							...(evidenceLink ? [{ name: `${emojis.custom.link} Evidence`, value: `[View message](${evidenceLink})` }] : [])
						)
						.setTimestamp();
					if (evidence) notice.setImage(evidence.url);
					await sendDmNotice({
						user: targetUser,
						payload: { embeds: [notice] },
						logger: this.container.logger,
						action: 'ban'
					});
				}
				await interaction.guild.members.ban(targetId, { reason: `Banned by ${interaction.user.tag}: ${reason}` });
			},
			success: () => {
				const embed = createModerationEmbed({
					target: targetUser?.tag || targetId,
					action: 'banned',
					reason,
					moderator: interaction.user,
					colorValue: color.success,
					footer: `User Banned: ${targetId}`
				});
				if (evidence) embed.setImage(evidence.url);
				if (evidenceLink) embed.addFields({ name: `${emojis.custom.link} Evidence`, value: `[View message](${evidenceLink})` });
				return { embeds: [embed] };
			}
		});
	}
}

function normalizeEvidenceMessageLink(value, guildId) {
	const match = String(value || '').trim().match(/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})$/i);
	if (!match || match[1] !== guildId) return null;
	return `https://discord.com/channels/${match[1]}/${match[2]}/${match[3]}`;
}

module.exports = { UserCommand, normalizeEvidenceMessageLink };
