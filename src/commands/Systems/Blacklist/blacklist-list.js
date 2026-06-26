const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { branding, color, emojis } = require('../../../config');
const Guild = require('../../../lib/schemas/blacklistSchema');
const { PaginatedMessageEmbedFields } = require('@sapphire/discord.js-utilities');
const { commandMention } = require('../../../lib/util/commandMentions');

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
		} catch (error) {
			console.error(error);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(
					`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](${branding.supportServerUrl}) for assistance or use ${commandMention('bug-report')}*`
				)
				.setTimestamp();

			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
			return;
		}
	}
}

module.exports = {
	UserCommand
};
