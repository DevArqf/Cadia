const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { emojis, color } = require('../../config');
const { EmbedBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'The credits that the Developers and Teams deserve!'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('credits')
				.setDescription(this.description)
		        );
	        }

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const embed = new EmbedBuilder()
        .setDescription(`${emojis.custom.heart2} A **HUGE** thanks to all the people who assisted with the development of Cadia!`)
        .addFields(
            { name: "navin5023", value: "> Assisting with **30%** of Cadia's **overall** making.\n [Navin's APIs](https://baymax-apis.onrender.com/docs/)\n [Navin's Github](https://github.com/uhhhhh1231)", inline: true },
            { name: "theoreotm", value: "> Assisting with the choice of framework and **30%** of Cadia's **overall** making.\n [Oreo's Website](https://oreotm.xyz/)\n [Oreo's Github](https://github.com/TheOreoTM)", inline: false },
	    { name: "Toowake Development's Team", value: "> Assisting and Provided Cadia with some Code.\n [Toowake's Discord](https://discord.gg/toowake-dev-hosting-1121353922355929129)", inline: false},
	    { name: "Diptodeep", value: "> Provided Code of Cadia's Minigame System.", inline: false }
        )
        .setColor(color.default)
        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
        
        await interaction.reply(
            {
                embeds: [embed]
            }
        )
    }
};

module.exports = {
	UserCommand
};
