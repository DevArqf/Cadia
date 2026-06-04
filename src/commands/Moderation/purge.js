const { PermissionLevels } = require('../../lib/types/Enums');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionsBitField, EmbedBuilder , MessageFlags} = require('discord.js');
const { color, emojis } = require('../../config');;

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Bulk deletes a given amount of messages. Limit is 100.',
			requiredUserPermissions: ['ManageMessages']
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('purge')
				.setDescription(this.description)
				.addIntegerOption((option) => option.setName('amount').setDescription('Number of messages to purge').setRequired(true))
				.addStringOption((option) =>
					option
						.setName('filter')
						.setDescription('Filter options for purging')
						.setRequired(true)
						.addChoices(
							{ name: 'All', value: 'all' },
							{ name: 'Links', value: 'links' },
							{ name: 'Bot Messages', value: 'bot' },
							{ name: 'Invites', value: 'invites' },
							{ name: 'Attachments', value: 'attachments' },
							{ name: 'Images', value: 'images' }
						)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		// Retrieving parameters from user interaction
		const amount = interaction.options.getInteger('amount');
		const filter = interaction.options.getString('filter');
		const channel = interaction.channel;

		// Validating the amount of messages to purge
		if (amount < 1 || amount > 100) {
			// Building and sending embed for invalid amount error
			const invalidAmountEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} Please specify a valid number of messages to purge (1-100).`)
				.setTimestamp();

			return interaction.reply({ embeds: [invalidAmountEmbed], flags: MessageFlags.Ephemeral });
		}

		let messages;

		try {
			// Fetching and filtering messages based on the provided filter
			switch (filter) {
				case 'links':
					messages = await channel.messages.fetch({ limit: amount });
					messages = messages.filter((msg) => msg.content.includes('http://') || msg.content.includes('https://'));
					break;
				case 'bot':
					messages = await channel.messages.fetch({ limit: amount });
					messages = messages.filter((msg) => msg.author.bot);
					break;
				case 'invites':
					messages = await channel.messages.fetch({ limit: amount });
					messages = messages.filter((msg) => /discord\.gg\/\w+/i.test(msg.content));
					break;
				case 'attachments':
					messages = await channel.messages.fetch({ limit: amount });
					messages = messages.filter((msg) => msg.attachments.size > 0);
					break;
				case 'images':
					messages = await channel.messages.fetch({ limit: amount });
					messages = messages.filter((msg) => msg.attachments.some((attachment) => attachment.name.match(/\.(png|jpe?g|gif)$/i)));
					break;
				case 'all':
				default:
					messages = await channel.messages.fetch({ limit: amount });
					break;
			}

			// Handling cases when no messages found to purge
			if (messages.size === 0) {
				// Building and sending embed for no messages to purge
				const noMessagesEmbed = new EmbedBuilder()
					.setColor(color.fail)
					.setDescription(`${emojis.custom.fail} Uh Oh... There are no messages in the channel to purge.`)
					.setTimestamp();

				return interaction.reply({ embeds: [noMessagesEmbed], flags: MessageFlags.Ephemeral });
			}

			// Purging the messages and sending success message
			await channel.bulkDelete([...messages.values()], true);
			const purgeSuccessEmbed = new EmbedBuilder()
				.setColor(color.success)
				.setDescription(`${emojis.custom.success} Successfully purged **${messages.size}** message(s).`)
				.setTimestamp();

			interaction.reply({ embeds: [purgeSuccessEmbed], flags: MessageFlags.Ephemeral });
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
