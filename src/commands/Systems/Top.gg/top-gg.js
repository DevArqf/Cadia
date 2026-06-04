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

        const { created, poster } = getTopggPoster(interaction.client, token);

        poster.post();

        return interaction.editReply({
            content: created
                ? `${emojis.custom.success} Top.gg autoposter has been **started** and a stats post was queued.`
                : `${emojis.custom.success} Top.gg autoposter is **already running**. A stats post was queued.`
        });
	}
};

function getTopggPoster(client, token) {
    if (client.topggPoster) return { created: false, poster: client.topggPoster };

    const poster = AutoPoster(token, client, {
        postOnStart: false
    });

    poster.on('posted', () => {
        client.logger?.info?.('Successfully posted Cadia stats to Top.gg');
    });

    poster.on('error', (error) => {
        client.logger?.error?.(error);
    });

    client.topggPoster = poster;
    return { created: true, poster };
}

module.exports = {
	UserCommand,
	getTopggPoster
};
