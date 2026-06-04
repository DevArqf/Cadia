const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Receive information regarding a role within the server"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('role-info')
				.setDescription(this.description)
				.addRoleOption(option =>
					option.setName("role")
						.setDescription("Choose the role to acquire the details of.")
						.setRequired(true)),
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const role = interaction.options.getRole('role');

        if (!role || !role.id) return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`${emojis.custom.warning} \`-\` The specified role does **not** exist!`)
            ],
            flags: MessageFlags.Ephemeral
        })

        if (role.name === "@everyone") return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`${emojis.custom.warning} \`-\` ${role.name} role is **not** available. The role **cannot** be \`@everyone\`!`)
            ],
            flags: MessageFlags.Ephemeral
        }) 

		const serverIcon = interaction.guild.iconURL({ dynamic: true, format: 'png', size: 256 });
        const createdTime = parseInt(role.createdTimestamp / 1000);
        const mentionable = role.mentionable ? "true" : "false";
        const managed = role.managed ? "true" : "false";
        const hoisted = role.hoisted ? "true" : "false";
        const position = role.position
        const botrole = role.botrole ? "true" : "false";
        const permissions = role.permissions
            .toArray()
            .map((P) => `${P}`)
            .join(", ");

        const embed = new EmbedBuilder()
            .setColor(role.color)
            .addFields(
                { name: `\`👑\` \`-\` Name`, value: `${emojis.custom.arrowright} **${role.name}**`, inline: true },
                { name: `\`🎨\` \`-\` Color`, value: `${emojis.custom.arrowright} **${role.hexColor}**`, inline: true },
                { name: `\`👤\` \`-\` Mention`, value: `${emojis.custom.arrowright} **<@&${role.id}>**`, inline: true },
                { name: `\`🔒\` \`-\` Hoisted`, value: `${emojis.custom.arrowright} **${hoisted}**`, inline: true },
                { name: `\`🥇\` \`-\` Position`, value: `${emojis.custom.arrowright} **${position}**`, inline: true },
                { name: `\`🔊\` \`-\` Mentionable`, value: `${emojis.custom.arrowright} **${mentionable}**`, inline: true },
                { name: `\`🚨\` \`-\` Managed`, value: `${emojis.custom.arrowright} **${managed}**`, inline: true },
                { name: `\`🤖\` \`-\` Bot Role`, value: `${emojis.custom.arrowright} **${botrole}**`, inline: true },
                { name: `\`📅\` \`-\` Created`, value: `${emojis.custom.arrowright} <t:${createdTime}:R>`, inline: true },
                { name: `\`🔑\` \`-\` Key Permissions`, value: `${permissions}`, inline: false },
            )
            .setFooter({ text: `Role ID: ${role.id}`, iconURL: interaction.user.displayAvatarURL() })
			.setThumbnail(serverIcon)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    }
};

module.exports = {
	UserCommand
};