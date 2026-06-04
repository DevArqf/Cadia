const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Hack the mentioned user hehehe ;)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('hack')
				.setDescription(this.description)
                .addUserOption(option => option
                    .setName('target')
                    .setDescription('The mentioned user will get hacked')
                    .setRequired(true)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        const target = await interaction.options.getUser(`target`);
        if(!target) 
            return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription('Who are you trying to hack huh? Hack yourself? Mention a valid user to hack smh...')]});
        
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Running the process to hack ${target}...`)] })
        await wait(2500);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Installing malware on ${target}'s devices...`)] })
        await wait(2500);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Getting ${target}'s IP address, passwords and personal information...`)] })
        await wait(2500);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Hacking ${target}'s devices and Wi-Fi...`)] })
        await wait(2500);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Stealing ${target}'s mom's credit card...`)] })
        await wait(2500);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.loading} Exposing ${target}'s personal information...`)] })
        await wait(2500);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} **Mission complete!** I've successfully hacked ${target}'s devices and exposed everything they possibly have! \n\n ${emojis.custom.chad} __Respect++__`)] })
    }
};

module.exports = {
	UserCommand
};
