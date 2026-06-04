const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { EmbedBuilder , MessageFlags} = require('discord.js');
const { color, emojis } = require('../../config');;
const { ReleaseNotesSchema } = require('../../lib/schemas/releasenoteSchema');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Release Note"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('release-notes')
				.setDescription(this.description)
                .addSubcommand((command) => command
                    .setName('publish')
                    .setDescription('Add new release notes')
                    .addStringOption((option) => option
                        .setName('updated-notes')
                        .setDescription('The notes to publish')
                        .setRequired(true)))
                .addSubcommand((command) => command
                    .setName('view')
                    .setDescription('View the most recent release notes')),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const { DEVELOPERS } = process.env;
		const authorizedIDs = DEVELOPERS.split(' ');

        const sub = interaction.options.getSubcommand();
        var data = await ReleaseNotesSchema.find();

    async function sendMessage(message) {
        const embed = new EmbedBuilder()
        .setColor(color.default)
        .setDescription(message);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
            if (sub === 'publish') {
                if (!authorizedIDs.includes(interaction.user.id)) {
                    return await interaction.reply(`${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`);
                }

                const update = interaction.options.getString('updated-notes');
                const formattedUpdate = update.split(', ').join('\n');
                    if (data.length > 0) {
                await ReleaseNotesSchema.deleteMany();

                var version = 0;
                await data.forEach(async value => {
                    version += value.Version + 0.1;
                });
                    version = Math.round(version * 10) / 10;

                    await ReleaseNotesSchema.create({Updates: formattedUpdate, Date: Date.now(), Developer: interaction.user.username, Version: version});
                    await interaction.reply(`${emojis.custom.success} I have **successfully** updated your release notes`);
                    } else {
                    await ReleaseNotesSchema.create({Updates: formattedUpdate, Date: Date.now(), Developer: interaction.user.username, Version: 1.0});
                    await interaction.reply(`${emojis.custom.success} I have **successfully** updated your release notes`);
                };
            };
            if (sub === 'view') {
                let string = '';
                if (data.length == 0) {
                    await sendMessage(`${emojis.custom.warning} **There are no public release notes yet...**`);
                } else {
                    await data.forEach(async value => {
                        const updates = value.Updates.split(', ').map(update => `+ ${update}`).join('\n');
                        string += `\`${value.Version}\` \n\n**Update Information:**\n\`\`\`diff\n${updates}\n\`\`\`\n\n${emojis.custom.developer} \`-\` **Updating Developer:**\n > ${emojis.custom.arrowright} \`${value.Developer}\`\n ${emojis.custom.info} \`-\` **Update Data:**\n > ${emojis.custom.arrowright} <t:${Math.floor(value.Date / 1000)}:R>`
                    });
            
                    await sendMessage(`> ${emojis.custom.update} **Release Notes** ${string}`);
                }
            };            
    }
}

module.exports = {
	UserCommand
};