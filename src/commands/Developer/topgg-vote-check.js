const { EmbedBuilder, MessageFlags } = require('discord.js');
const { color, emojis } = require('../../config');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { checkTopggVote } = require('../../lib/util/topgg');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Check whether a user has an active Top.gg vote for Cadia'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('topgg-vote-check')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const user = interaction.options.getUser('user', true);
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const result = await checkTopggVote(user.id, interaction.client);
		if (result.missingToken) return interaction.editReply(`${emojis.custom.fail} Missing \`TOPGG_TOKEN\` in the environment.`);
		if (!result.ok) return interaction.editReply(`${emojis.custom.fail} ${result.error || 'Top.gg vote check failed.'}`);

		const embed = new EmbedBuilder()
			.setColor(result.voted ? color.success : color.warning)
			.setTitle('Top.gg Vote Check')
			.setDescription(
				[
					`${result.voted ? emojis.custom.success : emojis.custom.fail} **Status:** ${result.voted ? 'Active vote found' : 'No active vote found'}`,
					`${emojis.custom.person} **User:** ${user} (${user.id})`,
					`${emojis.custom.settings} **API:** Top.gg ${result.source}`
				]
					.concat(result.createdAt ? [`${emojis.custom.clock} **Voted:** <t:${toUnix(result.createdAt)}:F>`] : [])
					.concat(result.expiresAt ? [`${emojis.custom.info} **Expires:** <t:${toUnix(result.expiresAt)}:R>`] : [])
					.concat(result.weight ? [`${emojis.custom.gem} **Weight:** ${result.weight}`] : [])
					.join('\n')
			)
			.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }))
			.setTimestamp();

		return interaction.editReply({ embeds: [embed] });
	}
}

function toUnix(value) {
	return Math.floor(new Date(value).getTime() / 1000);
}

module.exports = {
	UserCommand
};
