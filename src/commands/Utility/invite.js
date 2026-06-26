const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { OAuth2Scopes } = require('discord.js');
const { getAllFeaturesOAuthUrl, invitePermissionPresets, isAllFeaturesPreset } = require('../../config/invite');
const { componentReply, linkButton, panel } = require('../../lib/util/components');

const permissionChoices = invitePermissionPresets.map(({ name, value }) => ({ name, value }));

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Get an invite link to invite me to your server'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('invite')
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('permissions')
						.setDescription('The permissions you want to add to the bot')
						.addChoices(...permissionChoices)
						.setRequired(true)
				)
		);
	}

	async chatInputRun(interaction) {
		const permissions = interaction.options.getString('permissions', true);
		const selected = permissionChoices.find((choice) => choice.value === permissions);
		const configuredAllFeaturesInvite = isAllFeaturesPreset(permissions) ? getAllFeaturesOAuthUrl() : '';
		const invite =
			configuredAllFeaturesInvite ||
			interaction.client.generateInvite({
				scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
				permissions: [permissions]
			});

		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.success,
					title: `${emojis.custom.success} **Invite Ready**`,
					subtitle: 'Cadia authorization link',
					sections: [
						`${emojis.custom.settings} **Permission Preset:** ${selected?.name ?? 'Custom'}`,
						`${emojis.custom.info} This preset grants only the permissions used by its listed Cadia features.`
					],
					buttons: [linkButton('Invite Cadia', invite)]
				}),
				true
			)
		);
	}
}

module.exports = {
	UserCommand
};
