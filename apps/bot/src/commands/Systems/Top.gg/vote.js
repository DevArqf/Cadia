const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { branding, color, emojis } = require('../../../config');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { checkTopggVote } = require('../../../lib/util/topgg');
const { commandMention } = require('../../../lib/util/commandMentions');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Everyone,
			description: 'Vote for Cadia on Top.gg'
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
				return interaction.editReply(buildVoteResponse(interaction.user));
			} else {
				return interaction.editReply(voteErrorMessage());
			}
		} catch (error) {
			if (!interaction.deferred && !interaction.replied) {
				return interaction.reply(voteErrorMessage());
			}
			return interaction.editReply(voteErrorMessage());
		}
	}
}

function voteErrorMessage() {
	return `${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](${branding.supportServerUrl}) for assistance or use ${commandMention('bug-report')}*`;
}

function buildVoteResponse(user) {
	const voteEmbed = new EmbedBuilder()
		.setColor(color.default)
		.setDescription(
			`${emojis.custom.heart2} Support Cadia by voting on any of the bot lists below. You can revisit this panel whenever a new vote becomes available.`
		)
		.setFooter({ text: `Requested by ${user.displayName}`, iconURL: user.displayAvatarURL() })
		.setTimestamp();

	const voteButtons = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setLabel('Top.gg').setURL(`https://top.gg/bot/${branding.applicationId}`).setStyle(ButtonStyle.Link),
		new ButtonBuilder().setLabel('DiscordBotList.com').setURL('https://discordbotlist.com/bots/cadia').setStyle(ButtonStyle.Link),
		new ButtonBuilder()
			.setLabel('DiscordList.gg')
			.setURL(`https://discordlist.gg/bot/${branding.applicationId}?message=success`)
			.setStyle(ButtonStyle.Link)
	);

	return { embeds: [voteEmbed], components: [voteButtons] };
}

module.exports = {
	UserCommand,
	buildVoteResponse
};
