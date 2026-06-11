const { emojis, color } = require('../../config');
const { EmbedBuilder, PermissionsBitField , MessageFlags} = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['KickMembers'],
			description: 'Kick a member from the server',
		});
	}
	/**
	 *
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('kick')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user to kick').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for kicking the user').setRequired(false))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		// Defining Things
		const userToKick = interaction.options.getUser('user'); 	
		const kickMember = await interaction.guild.members.cache.get(userToKick.id);
		const reason = interaction.options.getString('reason') || 'No reason provided';

		// Permissions
		// if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
		// 	return await interaction.reply({
		// 		content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`,
		// 		flags: MessageFlags.Ephemeral
		// 	});
		// }

		if (!kickMember) {
			return await interaction.reply({
				content: `${emojis.custom.fail} The user **mentioned** is no longer **within** the **server**!`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (!kickMember.kickable) {
			return await interaction.reply({
				content: `${emojis.custom.fail} I **cannot** kick this user because they are either **higher** than me or you!`,
				flags: MessageFlags.Ephemeral
			});
		}
		
		if (interaction.member.id === kickMember.id) {
			return interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You **cannot** kick yourself!`)], flags: MessageFlags.Ephemeral });
		}

		if (kickMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
			return interaction.reply({
				embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.forbidden} You **cannot** kick **staff members** or people with the **Administrator** permission!`)],
				flags: MessageFlags.Ephemeral
			});
		}

		// DM Message
		try {
			const dmEmbed = new EmbedBuilder()
				.setColor(color.default)
				.setDescription(`${emojis.custom.info} \`-\` You have been **kicked** from **${interaction.guild.name}**!`)
                .addFields(
                    {
                        name: `${emojis.custom.mail} \`-\` **Reason:**`,
                        value: `${emojis.custom.arrowright} **${reason}**`,
                        inline: false
                    },
                    {
                        name: `${emojis.custom.person} \`-\` **Moderator:**`,
                        value: `${emojis.custom.arrowright} **${interaction.user.displayName}**`,
                        inline: false
                    }
                )
                .setFooter({ text: `User Kicked: ${userToKick.id}` })
                .setTimestamp();

			await userToKick.send({ embeds: [dmEmbed] }).catch((error) => console.error(`I couldn\`t send a DM to ${userToKick.tag}.`, error));
			await userToKick.send({ embeds: [dmEmbed] }).catch((error) => console.error(`I **cannot** send a Direct Message to ${userToKick.tag}.`, error));

			// Kick Successful
			const kickConfirmationEmbed = new EmbedBuilder()
				.setColor(color.default)
                .setDescription(`${emojis.custom.info} \`-\` **${userToKick.tag}** has been **kicked**!`)
                .addFields(
                    {
                        name: `${emojis.custom.mail} \`-\` **Reason:**`,
                        value: `${emojis.custom.arrowright} **${reason}**`,
                        inline: false
                    },
                    {
                        name: `${emojis.custom.person} \`-\` **Moderator:**`,
                        value: `${emojis.custom.arrowright} **${interaction.user.displayName}**`,
                        inline: false
                    }
                )
                .setFooter({ text: `User Kicked: ${userToKick.id}` })
                .setTimestamp();

			// Kick Failed
			await interaction.guild.members.kick(userToKick, { reason: `**Kicked** by ${interaction.user.tag}: ${reason}` });
			await interaction.guild.members.kick(userToKick, { reason: `${userToKick.id}: ${reason}` });
			await interaction.reply({ embeds: [kickConfirmationEmbed] });
		} catch (error) {
			console.error(error);
        	const errorEmbed = new EmbedBuilder()
            	.setColor(color.fail)
            	.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/26R7kXa6dx) for assistance or use </bugreport:1219050295770742934>*`)
            	.setTimestamp();

			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });	
		}
	}
}
module.exports = {
	UserCommand
};