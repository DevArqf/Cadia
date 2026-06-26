const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { DataResolver, REST, Routes } = require('discord.js');
const { componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Add an animated banner (DEV ONLY)',
			permissionLevel: PermissionLevels.BotOwner
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('bot-banner')
				.setDescription(this.description)
				.addAttachmentOption((option) => option.setName('banner').setDescription('The banner you want to add').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const banner = interaction.options.getAttachment('banner', true);

		if (!['image/gif', 'image/png'].includes(banner.contentType)) {
			return interaction.reply(
				componentReply(notice(`${emojis.custom.warning} **Unsupported Banner**`, 'Please upload a GIF or PNG banner.', color.warning), true)
			);
		}

		try {
			const rest = new REST().setToken(process.env.TOKEN);
			await rest.patch(Routes.user(), {
				body: { banner: await DataResolver.resolveImage(banner.url) }
			});

			return interaction.reply(
				componentReply(
					panel({
						accentColor: color.success,
						title: `${emojis.custom.success} **Banner Updated**`,
						subtitle: 'Developer profile asset upload',
						sections: [
							`${emojis.custom.openfolder} **Asset:** ${banner.name ?? 'Uploaded file'}`,
							`${emojis.custom.info} Cadia's bot banner was updated successfully.`
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
						`${emojis.custom.fail} **Banner Upload Failed**`,
						'Discord rejected the uploaded banner asset. Check the image format, file size, and bot profile access.'
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
