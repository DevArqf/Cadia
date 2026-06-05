const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Add an animated avatar (DEV ONLY)',
			permissionLevel: PermissionLevels.BotOwner
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('bot-avatar')
				.setDescription(this.description)
				.addAttachmentOption((option) => option.setName('avatar').setDescription('The avatar you want to add').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const avatar = interaction.options.getAttachment('avatar', true);

		try {
			await interaction.client.user.setAvatar(avatar.url);
			return interaction.reply(
				componentReply(
					panel({
						accentColor: color.success,
						title: `${emojis.custom.success} **Avatar Updated**`,
						subtitle: 'Developer profile asset upload',
						sections: [
							`${emojis.custom.openfolder} **Asset:** ${avatar.name ?? 'Uploaded file'}`,
							`${emojis.custom.info} Cadia's bot avatar was updated successfully.`
						],
						footer: `${emojis.custom.person} Updated by ${interaction.user.displayName}`
					}),
					true
				)
			);
		} catch (error) {
			console.error(error);
			return interaction.reply(
				componentReply(
					notice(
						`${emojis.custom.fail} **Avatar Upload Failed**`,
						'Discord rejected the uploaded avatar asset. Check the image format and file size.'
					),
					true
				)
			);
		}
	}
}

module.exports = {
	UserCommand
};
