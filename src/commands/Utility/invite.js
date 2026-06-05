const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { OAuth2Scopes } = require('discord.js');
const { componentReply, linkButton, panel } = require('../../lib/util/components');

const permissionChoices = [
	{ name: 'View Server (No moderation perms)', value: '517547088960' },
	{ name: 'Basic Moderation (Manage messages, roles and emojis)', value: '545195949136' },
	{ name: 'Advanced Moderation (Manage server)', value: '545195949174' },
	{ name: 'Administrator (Every permission)', value: '8' }
];

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
		const invite = interaction.client.generateInvite({
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
						permissions === '8'
							? `${emojis.custom.warning} This invite grants **Administrator** permissions.`
							: `${emojis.custom.warning} Some features may require Administrator permissions later.`
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
