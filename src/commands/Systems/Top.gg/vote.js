const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { branding, color, emojis } = require('../../../config');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { checkTopggVote } = require('../../../lib/util/topgg');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Vote for Cadia on Top.gg (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('vote')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const userId = interaction.user.id;

		if (!process.env.TOPGG_TOKEN && !process.env.TOP_GG_TOKEN && !process.env.TOPGG_API_TOKEN) {
			return interaction.reply({ content: `${emojis.custom.fail} Missing \`TOPGG_TOKEN\` in the environment.`, flags: MessageFlags.Ephemeral });
		}

		try {
			await interaction.deferReply();
			const vote = await checkTopggVote(userId, interaction.client);
			if (vote.ok) {
				if (vote.voted) {
					return interaction.editReply(
						`${emojis.custom.success} You have **already** voted for Cadia. We **appreciate** you trying again!`
					);
				} else {
					const voteEmbed = new EmbedBuilder()
						.setColor(color.default)
						.setDescription(
							`${emojis.custom.heart2} It appears you're interested in **voting** for Cadia. To **cast** your vote, simply **click** the buttons **below** at your convenience!`
						)
						.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
						.setTimestamp();

					const voteButton1 = new ActionRowBuilder()
						.addComponents(
							new ButtonBuilder().setLabel('Top.gg').setURL(`https://top.gg/bot/${branding.applicationId}`).setStyle(ButtonStyle.Link)
						)

						.addComponents(
							new ButtonBuilder()
								.setLabel('DiscordBotList.com')
								.setURL(`https://discordbotlist.com/bots/cadia`)
								.setStyle(ButtonStyle.Link)
						)

						.addComponents(
							new ButtonBuilder()
								.setLabel('DiscordList.gg')
								.setURL(`https://discordlist.gg/bot/${branding.applicationId}?message=success`)
								.setStyle(ButtonStyle.Link)
						);

					return interaction.editReply({ embeds: [voteEmbed], components: [voteButton1] });
				}
			} else {
				return interaction.editReply(
					`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](${branding.supportServerUrl}) for assistance or use </bugreport:${branding.bugReportCommandId}>*`
				);
			}
		} catch (error) {
			if (!interaction.deferred && !interaction.replied) {
				return interaction.reply(
					`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](${branding.supportServerUrl}) for assistance or use </bugreport:${branding.bugReportCommandId}>*`
				);
			}
			return interaction.editReply(
				`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](${branding.supportServerUrl}) for assistance or use </bugreport:${branding.bugReportCommandId}>*`
			);
		}
	}
}

module.exports = {
	UserCommand
};
