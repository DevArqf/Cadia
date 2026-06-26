const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { emojis } = require('../../../config');
const { postTopggStats, startTopggStatsPoster, syncTopggCommands } = require('../../../lib/util/topgg');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Posts Cadia statistics to top.gg (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('top-gg')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		await interaction.deferReply();

		if (!process.env.TOPGG_TOKEN && !process.env.TOP_GG_TOKEN && !process.env.TOPGG_API_TOKEN) {
			return interaction.editReply({ content: `${emojis.custom.fail} Missing \`TOPGG_TOKEN\` in the environment.` });
		}

		try {
			const stats = await postTopggStats(interaction.client);
			const commands = await syncTopggCommands(interaction.client);
			startTopggStatsPoster(interaction.client);

			return interaction.editReply({
				content: `${emojis.custom.success} Posted **${stats.serverCount}** servers to Top.gg and synced **${commands.commandCount}** commands.`
			});
		} catch (error) {
			return interaction.editReply({ content: `${emojis.custom.fail} ${error.message}` });
		}
	}
}

module.exports = {
	UserCommand
};
