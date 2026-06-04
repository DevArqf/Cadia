const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder, MessageFlags } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: "Modify the Cadia's Description"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('bot-description')
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('description')
						.setDescription('The new description for Cadia. Use \\n to add line breaks.')
						.setMaxLength(4000)
						.setRequired(true)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const description = interaction.options.getString('description', true).replace(/\\n/g, '\n');
			const descriptionPreview = description.length > 1024 ? `${description.slice(0, 1021)}...` : description;

			await interaction.client.application.fetch();
			await interaction.client.application.edit({ description });

			const embed = new EmbedBuilder()
				.setColor(color.success)
				.setDescription(`${emojis.custom.success} The bot description has been **successfully** updated!`)
				.addFields({ name: `${emojis.custom.pencil} \`-\` Description`, value: descriptionPreview || 'No description provided.' })
				.setTimestamp()
				.setFooter({ text: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() });

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error(error);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(
					`${emojis.custom.fail} Oopsie, I was unable to update the bot description. Please check the description length and try again.`
				)
				.setTimestamp();

			return interaction.editReply({ embeds: [errorEmbed] });
		}
	}
}

module.exports = {
	UserCommand
};
