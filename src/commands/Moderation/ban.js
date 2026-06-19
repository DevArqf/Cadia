const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { color, emojis } = require('../../config');

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
				.addAttachmentOption((option) => option.setName('evidence').setDescription('Attach evidence related to the ban'))
		);
	}

	async chatInputRun(interaction) {
		const selectedUser = interaction.options.getUser('user');
		const enteredUserId = interaction.options.getString('userid');
		const targetId = selectedUser?.id || enteredUserId;
		const reason = interaction.options.getString('reason') || 'No reason provided';
		const evidence = interaction.options.getAttachment('evidence');

		if (!targetId) {
			return interaction.reply({
				content: `${emojis.custom.fail} Select a user or provide a user ID.`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (selectedUser && enteredUserId && selectedUser.id !== enteredUserId) {
			return interaction.reply({
				content: `${emojis.custom.fail} Select a user or provide a user ID, not two different targets.`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (!/^\d{17,20}$/.test(targetId)) {
			return interaction.reply({
				content: `${emojis.custom.fail} Enter a valid Discord user ID.`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (interaction.user.id === targetId) {
			return interaction.reply({
				content: `${emojis.custom.fail} You **cannot** ban yourself.`,
				flags: MessageFlags.Ephemeral
			});
		}

		const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
		if (targetMember?.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: `${emojis.custom.forbidden} You **cannot** ban members with the **Administrator** permission.`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (targetMember && !targetMember.bannable) {
			return interaction.reply({
				content: `${emojis.custom.forbidden} I cannot ban this member because their role is higher than Cadia's role.`,
				flags: MessageFlags.Ephemeral
			});
		}

		await interaction.deferReply();

		try {
			const targetUser = selectedUser || targetMember?.user || (await interaction.client.users.fetch(targetId).catch(() => null));
			if (targetUser) await sendBanNotice(targetUser, interaction, reason, evidence);

			await interaction.guild.members.ban(targetId, {
				reason: `Banned by ${interaction.user.tag}: ${reason}`
			});

			const confirmation = new EmbedBuilder()
				.setColor(color.success)
				.setDescription(`${emojis.custom.info} **${targetUser?.tag || targetId}** has been **banned**.`)
				.addFields(
					{ name: `${emojis.custom.mail} Reason`, value: reason },
					{ name: `${emojis.custom.person} Moderator`, value: interaction.user.toString() }
				)
				.setFooter({ text: `User Banned: ${targetId}` })
				.setTimestamp();

			if (evidence) confirmation.setImage(evidence.url);
			return interaction.editReply({ embeds: [confirmation] });
		} catch (error) {
			this.container.logger.error(error);
			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} Cadia could not ban that user. Check the bot's role position and **Ban Members** permission.`)
				.setTimestamp();

			return interaction.editReply({ embeds: [errorEmbed] });
		}
	}
}

async function sendBanNotice(user, interaction, reason, evidence) {
	const embed = new EmbedBuilder()
		.setColor(color.fail)
		.setDescription(`${emojis.custom.info} You have been **banned** from **${interaction.guild.name}**.`)
		.addFields(
			{ name: `${emojis.custom.mail} Reason`, value: reason },
			{ name: `${emojis.custom.person} Moderator`, value: interaction.user.toString() }
		)
		.setThumbnail(interaction.guild.iconURL())
		.setFooter({ text: 'You have been banned' })
		.setTimestamp();

	if (evidence) embed.setImage(evidence.url);
	await user.send({ embeds: [embed] }).catch((error) => interaction.client.logger.warn(`Could not DM ${user.tag}: ${error.message}`));
}

module.exports = {
	UserCommand
};
