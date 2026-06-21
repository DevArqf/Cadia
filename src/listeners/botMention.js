const { Listener } = require('@sapphire/framework');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { branding } = require('../config/branding');
const { color } = require('../config/colors');
const { emojis } = require('../config/emojis');
const { createInviteUrl, invitePermissions } = require('../config/invite');

class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			event: 'messageCreate',
			once: false
		});
	}

	async run(message) {
		const botId = message.client.user?.id;
		if (message.author.bot || !botId || !message.mentions.users.has(botId)) return;

		const commands = this.container.stores.get('commands').size;
		await message.client.guilds.fetch();
		const members = message.client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
		const servers = message.client.guilds.cache.size;
		const inviteUrl = createInviteUrl(message.client);

		const embed = new EmbedBuilder()
			.setColor(color.default)
			.setDescription(
				`${emojis.custom.rpguser} Hey **${message.author.username}**! ${branding.name} is a story-driven Discord RPG.\n\n` +
					`${emojis.custom.arrowright} Start with \`/rpg tutorial\`, create a Warden with \`/rpg create\`, then begin with \`/rpg adventure\`.\n` +
					`${emojis.custom.settings} Moderation and utility features are available under **Community Tools** in </help:${branding.helpCommandId}>.`
			)
			.addFields(
				{ name: `${emojis.custom.slash} Commands`, value: `${emojis.custom.arrowright} **${commands}**`, inline: true },
				{ name: `${emojis.custom.community} Users`, value: `${emojis.custom.arrowright} **${members}**`, inline: true },
				{ name: `${emojis.custom.compass} Servers`, value: `${emojis.custom.arrowright} **${servers}**`, inline: true }
			)
			.setTimestamp()
			.setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setEmoji(emojis.custom.link).setLabel(`Invite ${branding.name}`).setURL(inviteUrl).setStyle(ButtonStyle.Link),
			new ButtonBuilder().setLabel('Support Server').setURL(branding.supportServerUrl).setStyle(ButtonStyle.Link),
			new ButtonBuilder().setEmoji(emojis.custom.trash).setLabel('Delete').setStyle(ButtonStyle.Danger).setCustomId('deleteMentionReply')
		);

		const reply = await message.reply({ embeds: [embed], components: [buttons] });
		const collector = reply.createMessageComponentCollector({
			time: 300_000,
			filter: (interaction) => isMentionDeleteInteraction(interaction, reply.id, message.author.id)
		});

		collector.on('collect', async (interaction) => {
			try {
				await interaction.deferUpdate();
				await reply.delete();
				collector.stop('deleted');
			} catch (error) {
				this.container.logger.error(error);
				const errorEmbed = new EmbedBuilder()
					.setColor(color.fail)
					.setDescription(
						`${emojis.custom.fail} I could not delete that message. Try again, or report the problem with </bugreport:${branding.bugReportCommandId}>.`
					)
					.setTimestamp();

				if (interaction.deferred || interaction.replied) {
					await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
				} else {
					await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
				}
			}
		});
	}
}

function isMentionDeleteInteraction(interaction, replyId, authorId) {
	return (
		interaction.isButton() &&
		interaction.customId === 'deleteMentionReply' &&
		interaction.message.id === replyId &&
		interaction.user.id === authorId
	);
}

module.exports = {
	INVITE_PERMISSIONS: invitePermissions,
	UserEvent,
	isMentionDeleteInteraction
};
