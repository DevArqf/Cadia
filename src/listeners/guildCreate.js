const { Events, Listener } = require('@sapphire/framework');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	PermissionFlagsBits
} = require('discord.js');
const { branding } = require('../config/branding');
const { color } = require('../config/colors');
const { emojis } = require('../config/emojis');
const { createInviteUrl } = require('../config/invite');
const { selectOnboardingVariant } = require('../lib/analytics/growth');
const { recordGuildJoin, recordOnboardingOutcome } = require('../lib/util/botAnalytics');
const { postTopggStats } = require('../lib/util/topgg');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: Events.GuildCreate });
	}

	async run(guild) {
		await recordGuildJoin(guild);
		postTopggStats(guild.client).catch((error) => guild.client.logger?.warn?.(error.message));

		const variant = selectOnboardingVariant(guild.id);
		const result = await deliverOnboarding(guild, variant);
		await recordOnboardingOutcome(guild, {
			variant,
			delivered: result.targets.length > 0,
			target: result.targets.join('+') || null,
			error: result.error
		});

		if (result.error) guild.client.logger?.warn?.(`Onboarding delivery for ${guild.id}: ${result.error.message}`);
	}
}

async function deliverOnboarding(guild, variant) {
	const client = guild.client;
	const embed = buildOnboardingEmbed(guild, variant);
	const inviteUrl = createInviteUrl(client);
	const applicationId = client.application?.id || client.user.id;
	const voteUrl = `https://top.gg/bot/${applicationId}`;
	const channelRow = buildChannelButtons(inviteUrl, voteUrl);
	const ownerRow = buildOwnerButtons(voteUrl);
	const targets = [];
	const errors = [];

	const [ownerResult, channelResult] = await Promise.allSettled([
		guild.fetchOwner().then((owner) => owner.send({ embeds: [embed], components: [ownerRow] })),
		Promise.resolve(findOnboardingChannel(guild)).then((channel) => {
			if (!channel) throw new Error('No eligible text channel');
			return channel.send({ embeds: [embed], components: [channelRow] });
		})
	]);

	if (ownerResult.status === 'fulfilled') targets.push('owner');
	else errors.push(ownerResult.reason);
	if (channelResult.status === 'fulfilled') targets.push('channel');
	else errors.push(channelResult.reason);

	return {
		targets,
		error: errors[0] || (targets.length ? null : new Error('Onboarding was not delivered'))
	};
}

function buildOnboardingEmbed(guild, variant) {
	const guided =
		`${emojis.custom.heart1} **Thanks for adding ${branding.name}!**\n\n` +
		`${emojis.custom.settings} **Start with server setup**\n` +
		`${emojis.custom.arrowright} Run \`/help\` to browse commands.\n` +
		`${emojis.custom.arrowright} Try \`/logging\`, \`/welcome\`, or \`/ticket\` to configure your community.\n` +
		`${emojis.custom.arrowright} Test moderation with \`/mute\` or \`/kick\` on a lower-role test account.\n\n` +
		`${emojis.custom.rpguser} **Optional RPG path**\n` +
		`${emojis.custom.arrowright} Run \`/rpg tutorial\`, then \`/rpg create\` when you want to play.\n\n` +
		`${emojis.custom.warning} Keep ${branding.name}'s role above roles it needs to moderate.`;
	const control =
		`${emojis.custom.heart1} **Thank you for adding ${branding.name} to ${guild.name}!**\n` +
		`${emojis.custom.arrowright} Run \`/help\` to browse commands or join the support server if you need assistance.\n\n` +
		`${emojis.custom.warning} Keep ${branding.name}'s role above roles it needs to moderate.`;

	return new EmbedBuilder()
		.setColor(color.default)
		.setDescription(variant === 'guided' ? guided : control)
		.setThumbnail(guild.client.user.displayAvatarURL({ extension: 'png', size: 256 }))
		.setFooter({ text: `Onboarding: ${variant}` })
		.setTimestamp();
}

function buildChannelButtons(inviteUrl, voteUrl) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setEmoji(emojis.custom.home).setLabel('Support Server').setURL(branding.supportServerUrl).setStyle(ButtonStyle.Link),
		new ButtonBuilder().setEmoji(emojis.custom.link).setLabel(`Invite ${branding.name}`).setURL(inviteUrl).setStyle(ButtonStyle.Link),
		new ButtonBuilder().setEmoji(emojis.custom.gem).setLabel('Vote').setURL(voteUrl).setStyle(ButtonStyle.Link)
	);
}

function buildOwnerButtons(voteUrl) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder().setEmoji(emojis.custom.home).setLabel('Support Server').setURL(branding.supportServerUrl).setStyle(ButtonStyle.Link),
		new ButtonBuilder().setEmoji(emojis.custom.gem).setLabel('Vote').setURL(voteUrl).setStyle(ButtonStyle.Link)
	);
}

function findOnboardingChannel(guild) {
	const botMember = guild.members.me;
	const eligible = (channel) => {
		if (!botMember || !channel || channel.type !== ChannelType.GuildText || !channel.isTextBased?.()) return false;
		const permissions = channel.permissionsFor?.(botMember);
		return permissions?.has(PermissionFlagsBits.ViewChannel) && permissions.has(PermissionFlagsBits.SendMessages) && permissions.has(PermissionFlagsBits.EmbedLinks);
	};

	if (eligible(guild.systemChannel)) return guild.systemChannel;
	return guild.channels.cache
		.filter(eligible)
		.sort((left, right) => left.rawPosition - right.rawPosition || left.id.localeCompare(right.id))
		.first();
}

module.exports = {
	UserEvent,
	buildOnboardingEmbed,
	deliverOnboarding,
	findOnboardingChannel
};
