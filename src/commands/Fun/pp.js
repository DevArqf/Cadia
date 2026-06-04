const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'This is not able to be discussed about'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('pp')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        const ppSize = Math.floor(Math.random() * 10) + 1;
        let ppMain = '8';
        for (let i = 0; i < ppSize; i++) {
            ppMain += '=';
        }

        
        const ppEmbed = new EmbedBuilder()
            .setColor(color.random)
            .setTitle(`${interaction.user.username}'s pp size :0`)
            .setDescription(`Your pp size is  ${ppMain}D`)

        await interaction.reply({ embeds: [ppEmbed] });
    }
};

module.exports = {
	UserCommand
};
