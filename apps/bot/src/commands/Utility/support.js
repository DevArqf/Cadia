const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { branding, color, emojis } = require('../../config');
const { ButtonBuilder, ButtonStyle } = require('discord.js');
const { componentReply, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Join the official Cadia support server'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('support').setDescription(this.description));
	}

	chatInputRun(interaction) {
		const supportButton = new ButtonBuilder().setLabel('Join Cadia Support').setStyle(ButtonStyle.Link).setURL(branding.supportServerUrl);

		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.default,
					title: `${emojis.custom.community} **Cadia Support Server**`,
					sections: [
						'Get help with Cadia, report issues, ask RPG questions, and receive development updates.',
						`${emojis.custom.arrowright} Use the button below to join the official support server.`
					],
					buttons: [supportButton],
					footer: 'Cadia support and community'
				}),
				true
			)
		);
	}
}

module.exports = {
	UserCommand
};
