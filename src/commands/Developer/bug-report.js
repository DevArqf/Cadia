const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis, channels } = require('../../config')
const { EmbedBuilder, PermissionsBitField, ButtonStyle, ButtonBuilder, ActionRowBuilder , MessageFlags} = require('discord.js');
const { BugReportBlacklist } = require('../../lib/schemas/bugreportSchema');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Submit a bug report to the Developers of Cadia'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('bug-report')
				.setDescription(this.description)

				// Main cmd
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('send')
						.setDescription('Submit a bug report to the Developer of Cadia')
                .addStringOption(option =>
                    option
                        .setName('issue')
                        .setDescription('Describe the issue(s) you encountered')
                        .setRequired(true))
				.addStringOption(option =>
					option
						.setName('system')
						.setDescription('What command or system did you find this bug in?')
						.setRequired(true))
                .addAttachmentOption(option =>
                    option
                        .setName('image')
                        .setDescription('Attach a image related to the issue you encountered')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('notes')
                        .setDescription('Do you have any additional note for the developers?')
                        .setRequired(false)))

				//Blacklist
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('blacklist-user')
						.setDescription('Blacklist a user from executing the bug-report command')
				.addStringOption(option =>
					option
						.setName('user-id')
						.setDescription('The ID of the user')
						.setRequired(true))
				.addStringOption(option =>
					option
						.setName('reason')
						.setDescription('The reason of blacklisting the user')
						.setRequired(false)))
				
				//Un-Blacklist
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('unblacklist-user')
						.setDescription('Unblacklist a user from executing the bug-report command')
				.addStringOption(option =>
					option
						.setName('user-id')
						.setDescription('The ID of the user')
						.setRequired(true))),
        );

	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const { DEVELOPERS } = process.env;
		const authorizedIDs = DEVELOPERS.split(' ');

		if (subcommand === 'blacklist-user') {
			if (!authorizedIDs.includes(interaction.user.id)) { 
				return await interaction.reply(`${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`);
			};

			const userId = interaction.options.getString('user-id');
			const reason = interaction.options.getString('reason') || 'No reason provided';

			if (Number.isNaN(userId)) {
				return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} You have **entered** a character that is **not** a number.`)], flags: MessageFlags.Ephemeral });
			};
			const find = await BugReportBlacklist.find({ userID: userId });

			if (find.length === 0) {
				await BugReportBlacklist.create({ userID: userId, reason });
				return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} **Successfully Blacklisted!**\n\`${userId}\` has been **blacklisted** from executing the **bug-report** command\n\n**Reason:**\n ${emojis.custom.arrowright} \`${reason}\``)], flags: MessageFlags.Ephemeral});
			}
			return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} **Failed to Backlist!**\n\n\`${userId}\` **cannot** be **blacklisted** from executing the **bug-report** command as they have already been **blacklisted**`)], flags: MessageFlags.Ephemeral});

		}

		if (subcommand === 'unblacklist-user') {
			if (!authorizedIDs.includes(interaction.user.id)) { 
				return await interaction.reply(`${emojis.custom.forbidden} You are not **authorized** to **execute** this command!`);
			};
			const userId = interaction.options.getString('user-id');
			const find = await BugReportBlacklist.find({ userID: userId });

			if (find.length !== 0) {
				await BugReportBlacklist.findOneAndDelete({ userID: userId });
				return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} **Successfully Unblacklisted!**\n\`${userId}\` has been **sucessfully** Unblacklisted`)], flags: MessageFlags.Ephemeral })
			}
			return await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} **Failed to Unblacklist!**\n\n\`${userId}\` **cannot** be **blacklisted** from **executing** the **bug-report** command as they have already been **blacklisted**`)], flags: MessageFlags.Ephemeral});

		};

		if (subcommand === 'send') {
			const find = await BugReportBlacklist.find({ userID: interaction.user.id });
			if (find.length !== 0) {
				const blacklistEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.warning} You have been **blacklisted** from **executing** the bug-report command! Please join our discord server [here](https://discord.gg/2XunevgrHD) for more info.`)
				.setTimestamp()
				.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });

			return await interaction.reply({ embeds: [blacklistEmbed], flags: MessageFlags.Ephemeral })
			};
			
			const issue = interaction.options.getString('issue');
			const notes = interaction.options.getString('notes') || 'No notes provided';
			const image = interaction.options.getAttachment('image');
			const system = interaction.options.getString('system');
			
			const BugReportChanel = interaction.client.channels.cache.get(channels.bugReports);

		const sentEmbed = new EmbedBuilder()
		.setColor(`${color.random}`)
		.setDescription(`${emojis.custom.success} **Thank you for submitting this bug report.** The Developers will **investigate** the bug **very** soon.\n ${emojis.custom.arrowright} ${emojis.custom.warning} Abusing or misusing this feature will **result** in you getting **blacklisted**!`) // \n\n **Issue:**\n${emojis.custom.arrowright} ${issue}\n\n **Notes:**\n${emojis.custom.arrowright} ${notes} \n\n**Image:**\n ${image ? `${emojis.custom.arrowright} Please look below` : `${emojis.custom.arrowright} No picture provided`}\n\n**System:**\n ${emojis.custom.arrowright} ${system} **Abusing** this feature will **result** in you getting **blacklisted***!`)
		.addFields([
			{ name: `${emojis.custom.warning} \`-\` **Bug:**`, value: `${emojis.custom.arrowright} ${issue}` },
			{ name: `${emojis.custom.pencil} \`-\` **Notes:**'`, value: `${emojis.custom.arrowright} ${notes}` },
			{ name: `${emojis.custom.settings} \`-\` **System:**`, value: `${emojis.custom.arrowright} ${system}` },
			{ name: `${emojis.custom.save} \`-\` **Image:**`, value: `${image ? `${emojis.custom.arrowright} Please take look below` : `${emojis.custom.arrowright} No picture provided`}` }
		])
		.setImage(image ? image.url : null)
		.setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });

		const devEmbed = new EmbedBuilder()
		.setColor(color.default)
		.setTitle(`${emojis.custom.mail} New Bug Report`)
		.addFields([
			{ name: `${emojis.custom.person} \`-\` **User info:**`, value: `${emojis.custom.arrowright} **User ID:** ${interaction.user.id}\n${emojis.custom.arrowright} **User:** <@${interaction.user.id}>` },
			{ name: `${emojis.custom.warning} **Bug:**`, value: `${emojis.custom.arrowright} ${issue}` },
			{ name: `${emojis.custom.pencil} \`-\` **Notes:**'`, value: `${emojis.custom.arrowright} ${notes}` },
			{ name: `${emojis.custom.settings} \`-\` **System:**`, value: `${emojis.custom.arrowright} ${system}`},
			{ name: `${emojis.custom.save} \`-\` **Image:**`, value: `${image ? `${emojis.custom.arrowright} Please look below` : `${emojis.custom.arrowright} No picture provided`}` },
			])
		.setTimestamp()
		.setFooter({ text: `Report submitted by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
		.setImage(image ? image.url : null);
			
			const button = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setEmoji(emojis.custom.success)
					.setLabel("Solved")
					.setStyle(ButtonStyle.Success)
					.setCustomId("solve")
					)
					
					await interaction.reply({ embeds: [sentEmbed] });
					const sendMessage = await BugReportChanel.send({ embeds: [devEmbed], components: [button] });
					const collector = sendMessage.createMessageComponentCollector({ time: 604800000 });
					
					collector.on('collect', async (interaction) => {
						if (!interaction.isButton() || interaction.message.id !== sendMessage.id) return;
						
						const { customId } = interaction;
						
						if (customId === 'solve') {
				try {
					
					const user = interaction.user.displayName;
					const newActionRowEmbeds = interaction.message.components.map((oldActionRow) => {
						const updatesActionRow = new ActionRowBuilder();

						updatesActionRow.addComponents(
							oldActionRow.components.map((buttonComponent) => {
								const newButton = new ButtonBuilder()
									.setCustomId(buttonComponent.customId)
									.setEmoji(emojis.custom.success)
									.setLabel(`Bug solved by ${user}`)
									.setStyle(ButtonStyle.Success)
									.setDisabled(true)

							return newButton;
							})
						);
						return updatesActionRow;
					});
					const successEmbed = new EmbedBuilder()
						.setColor(color.success)
						.setDescription(`${emojis.custom.success} **Marked Resolved**\n\nThis bug report has been **successfully** been marked as **resolved**.`)
					await interaction.reply({ embeds: [successEmbed] , flags: MessageFlags.Ephemeral });
					await interaction.message.edit({ components: newActionRowEmbeds });

				} catch (error) {
					console.error(error);
					const errorEmbed = new EmbedBuilder()
							.setColor(color.fail)
							.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
							.setTimestamp();
							
							return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
						}
					}});
					return;
				};
		}
};

module.exports = {
	UserCommand
};
