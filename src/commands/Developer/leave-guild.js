const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Forces Cadia to leave a server using a Guild ID (DEV ONLY)'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('guild-leave')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('guildid').setDescription('Provide the guild ID').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const guildId = interaction.options.getString('guildid', true);
		const guild = interaction.client.guilds.cache.get(guildId);

		if (!guild) {
			return interaction.reply(
				componentReply(
					notice(`${emojis.custom.warning} **Guild Not Found**`, `Cadia is not currently cached in guild \`${guildId}\`.`, color.warning),
					true
				)
			);
		}

		try {
			await guild.leave();
			return interaction.reply(
				componentReply(
					panel({
						accentColor: color.success,
						title: `${emojis.custom.disconnected} **Guild Left**`,
						subtitle: 'Owner guild control',
						sections: [
							`${emojis.custom.crown} **Guild:** ${guild.name}`,
							`${emojis.custom.pencil} **Guild ID:** \`${guild.id}\``,
							`${emojis.custom.community} **Members:** ${(guild.memberCount ?? 0).toLocaleString()}`
						],
						footer: `${emojis.custom.person} Requested by ${interaction.user.displayName}`
					}),
					true
				)
			);
		} catch (error) {
			console.error(error);
			return interaction.reply(
				componentReply(notice(`${emojis.custom.fail} **Leave Failed**`, 'Discord rejected the leave request for that guild.'), true)
			);
		}
	}
}

module.exports = {
	UserCommand
};
