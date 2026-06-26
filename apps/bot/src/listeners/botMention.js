const { Listener } = require('@sapphire/framework');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { branding } = require('../config/branding');
const { color } = require('../config/colors');
const { emojis } = require('../config/emojis');
const { createInviteUrl, invitePermissions } = require('../config/invite');
const { commandMention } = require('../lib/util/commandMentions');

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
		if (message.author.bot || !botId || !hasDirectBotMention(message, botId)) return;

		const commands = this.container.stores.get('commands').size;
		const members = message.client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
		const servers = message.client.guilds.cache.size;
		const inviteUrl = createInviteUrl(message.client);

		const embed = new EmbedBuilder()
			.setColor(color.default)
			.setDescription(
				`${emojis.custom.rpguser} Hey **${message.author.username}**! ${branding.name} is a story-driven Discord RPG.\n\n` +
					`${emojis.custom.arrowright} Start with ${commandMention('rpg tutorial')}, create a Warden with ${commandMention('rpg create')}, then begin with ${commandMention('rpg adventure')}.\n` +
					`${emojis.custom.settings} Moderation and utility features are available under **Community Tools** in ${commandMention('help')}.`
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
			new ButtonBuilder()
				.setEmoji(emojis.custom.trash)
				.setLabel('Delete')
				.setStyle(ButtonStyle.Danger)
				.setCustomId(`mention-delete:${message.author.id}`)
		);

		await message.reply({ embeds: [embed], components: [buttons] });
	}
}

async function handleMentionDeleteInteraction(interaction, { logger } = {}) {
	if (!isMentionDeleteInteraction(interaction)) return false;
	const [, authorId] = interaction.customId.split(':');
	if (interaction.user.id !== authorId) {
		return interaction.reply({
			content: `${emojis.custom.forbidden} Only the user who mentioned Cadia can delete this response.`,
			flags: MessageFlags.Ephemeral
		});
	}

	try {
		await interaction.deferUpdate();
		await interaction.message.delete();
		return true;
	} catch (error) {
		logger?.error?.(error);
		const errorEmbed = new EmbedBuilder()
			.setColor(color.fail)
			.setDescription(`${emojis.custom.fail} I could not delete that message. Try again, or report the problem with ${commandMention('bug-report')}.`)
			.setTimestamp();

		if (interaction.deferred || interaction.replied) {
			await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
		} else {
			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
		}
		return false;
	}
}

function isMentionDeleteInteraction(interaction, replyId, authorId) {
	const [, customAuthorId] = String(interaction.customId || '').split(':');
	const matchesLegacyShape =
		interaction.customId === 'deleteMentionReply' &&
		(!replyId || interaction.message?.id === replyId) &&
		(!authorId || interaction.user?.id === authorId);
	const matchesRestartSafeShape = interaction.customId?.startsWith('mention-delete:') && (!authorId || customAuthorId === authorId);
	return interaction.isButton() && (matchesLegacyShape || matchesRestartSafeShape);
}

function hasDirectBotMention(message, botId) {
	if (!botId) return false;

	if (typeof message.mentions?.has === 'function') {
		return message.mentions.has(botId, { ignoreRepliedUser: true });
	}

	const hasUserMention = message.mentions?.users?.has?.(botId);
	if (!hasUserMention) return false;

	const content = message.content ?? '';
	const directMention = content.includes(`<@${botId}>`) || content.includes(`<@!${botId}>`);

	if (directMention) return true;

	return !message.reference;
}

module.exports = {
	INVITE_PERMISSIONS: invitePermissions,
	UserEvent,
	handleMentionDeleteInteraction,
	hasDirectBotMention,
	isMentionDeleteInteraction
};
