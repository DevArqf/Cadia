const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const sourcebin = require('sourcebin_js');
const { componentReply, linkButton, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Shows all of the servers Cadia is in (DEV ONLY)'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('guild-list').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		try {
			const guilds = [...interaction.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);
			const list = guilds.map((guild) => `${guild.name} (${guild.id}) | ${guild.memberCount} Members | Owner: ${guild.ownerId}`).join('\n');
			const src = await sourcebin.create([{ name: 'Cadia Guild List', content: list || 'No guilds found.', languageId: 'text' }]);

			return interaction.reply(
				componentReply(
					panel({
						accentColor: color.success,
						title: `${emojis.custom.success} **Guild List Generated**`,
						subtitle: 'Private owner report',
						sections: [
							`${emojis.custom.community} **Servers:** ${guilds.length.toLocaleString()}`,
							`${emojis.custom.person} **Members:** ${guilds.reduce((total, guild) => total + (guild.memberCount ?? 0), 0).toLocaleString()}`
						],
						buttons: [linkButton('Open Sourcebin', src.url)]
					}),
					true
				)
			);
		} catch (error) {
			console.error(error);
			return interaction.reply(
				componentReply(notice(`${emojis.custom.fail} **Guild List Failed**`, 'I could not generate the guild list right now.'), true)
			);
		}
	}
}

module.exports = {
	UserCommand
};
