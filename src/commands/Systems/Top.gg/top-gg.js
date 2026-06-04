const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config');
const { AutoPoster } = require('topgg-autoposter');

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

        const token = process.env.TOPGG_TOKEN;

        if (!token) {
            return interaction.editReply({ content: `${emojis.custom.fail} Missing \`TOPGG_TOKEN\` in the environment.` });
        }

        const ap = AutoPoster(token, interaction.client);

        ap.on('posted', () => {
            interaction.editReply({ content: `${emojis.custom.success} I have **successfully** posted the stats to **Top.gg**`});
        })

        ap.on('error', () => {
            interaction.editReply({ content: `${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`});
        })
	}
};

module.exports = {
	UserCommand
};
