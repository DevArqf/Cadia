const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { EmbedBuilder, ButtonBuilder, ComponentType, ActionRowBuilder , MessageFlags} = require('discord.js');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config');
const Guild = require('../../../lib/schemas/blacklistSchema');
const { PaginatedMessageEmbedFields } = require('@sapphire/discord.js-utilities');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'View a list of all the blacklisted servers'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('blacklist-list')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const blacklistedGuilds = await Guild.find();

			if (blacklistedGuilds.length === 0) {
				return await interaction.reply(`${emojis.custom.fail} No blacklisted servers has been found!`);
			}

			/**
			 * @type {import('discord.js').EmbedField[]}
			 */
			const fields = [];

			for (const guild of blacklistedGuilds) {
				fields.push({
					name: `**__${guild.guildName}__**`,
					value: `${emojis.custom.mail} \`-\` **Reason:**\n ${emojis.custom.arrowright} **${guild.reason}**\n${emojis.custom.pencil} \`-\` **Server ID:**\n ${emojis.custom.arrowright} **${guild.guildId}**`
				});
			}

			const templateEmbed = new EmbedBuilder().setTitle(`${emojis.custom.lock} **Blacklisted Servers**`).setColor(color.default);

			new PaginatedMessageEmbedFields().setTemplate(templateEmbed).setItems(fields).setItemsPerPage(3).make().run(interaction);

			// let currentPage = 0;
			// const totalPages = Math.ceil(blacklistedGuilds.length / 5);

			// const generateEmbed = () => {
			//     const embed = new EmbedBuilder()
			//         .setTitle('`🔒` Blacklisted Servers')
			//         .setColor(color.default)
			//         .setDescription(
			//             blacklistedGuilds
			//             .slice(currentPage * 5, (currentPage + 1) * 5)
			//             .map(guild => `**__${guild.guildName}__**\n • Reason: ${emojis.custom.arrowright} ${guild.reason}\n\n • Server ID: ${emojis.custom.arrowright} ${interaction.guild.id}`)
			//             .join('\n')
			//         )
			//         .setFooter({ text: `Requested by ${interaction.user.displayName} • Page ${currentPage + 1}/${totalPages}`, iconURL: interaction.user.displayAvatarURL() });
			//     return embed;
			// };

			// const previousButton = new ButtonBuilder()
			//     .setCustomId('previous')
			//     .setLabel('◀️')
			//     .setStyle('Secondary');

			// const nextButton = new ButtonBuilder()
			//     .setCustomId('next')
			//     .setLabel('▶️')
			//     .setStyle('Secondary');

			// const actionRow = new ActionRowBuilder().addComponents([previousButton, nextButton]);
			// const reply = await interaction.reply({ embeds: [generateEmbed()], components: [actionRow] });

			// const collector = reply.createMessageComponentCollector({
			//     componentType: ComponentType.Button,
			//     filter: (i) => i.user.id === interaction.user.id,
			// });

			// collector.on('collect', async (interaction) => {
			//     if (interaction.customId === 'previous') {
			//         currentPage = Math.max(currentPage - 1, 0);
			//     } else if (interaction.customId === 'next') {
			//         currentPage = Math.min(currentPage + 1, totalPages - 1);
			//     }

			//     await interaction.update({ embeds: [generateEmbed()] });
			// });

			// collector.on('end', async () => {
			//     await reply.edit({ components: [] });
			// });

			// await reply.edit({ components: [actionRow] });
		} catch (error) {
			console.error(error);
			
			const errorEmbed = new EmbedBuilder()
            		.setColor(color.fail)
            		.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
            		.setTimestamp();
 
            		await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            		return;
		}
	}
}

module.exports = {
	UserCommand
};
