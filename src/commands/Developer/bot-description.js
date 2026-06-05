const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { MessageFlags } = require('discord.js');
const { componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: "Modify Cadia's description"
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
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

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });

		try {
			const description = interaction.options.getString('description', true).replace(/\\n/g, '\n');
			const descriptionPreview = description.length > 1400 ? `${description.slice(0, 1397)}...` : description;

			await interaction.client.application.fetch();
			await interaction.client.application.edit({ description });

			return interaction.editReply(
				componentReply(
					panel({
						accentColor: color.success,
						title: `${emojis.custom.success} **Description Updated**`,
						subtitle: 'Developer application profile edit',
						sections: [
							`${emojis.custom.pencil} **Preview**\n${descriptionPreview || 'No description provided.'}`,
							`${emojis.custom.info} Characters: **${description.length.toLocaleString()} / 4,000**`
						],
						footer: `${emojis.custom.person} Updated by ${interaction.user.displayName}`
					}),
					true
				)
			);
		} catch (error) {
			console.error(error);
			return interaction.editReply(
				componentReply(notice(`${emojis.custom.fail} **Description Update Failed**`, 'Check the description length and try again.'), true)
			);
		}
	}
}

module.exports = {
	UserCommand
};
