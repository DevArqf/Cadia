const { Listener, Events } = require('@sapphire/framework');
const { ButtonStyle, ActionRowBuilder, ButtonBuilder, Guild, EmbedBuilder, ChannelType } = require('discord.js');
const { color, emojis } = require('../config');
const { recordGuildJoin } = require('../lib/util/botAnalytics');
const { postTopggStats } = require('../lib/util/topgg');

class UserEvent extends Listener {
	/**
	 * @param {Listener.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			event: Events.GuildCreate
		});
	}

	/**
	 * @param {Guild} guild
	 */
	async run(guild) {
		try {
			await recordGuildJoin(guild);
			postTopggStats(guild.client).catch((error) => guild.client.logger?.warn?.(error.message));
			const owner = await guild.fetchOwner();
			const avatarURL = guild.client.user.displayAvatarURL({ format: 'png', size: 512 });
			const topChannel = guild.channels.cache
				.filter((c) => c.type === ChannelType.GuildText)
				.sort((a, b) => a.rawPosition - b.rawPosition || a.id - b.id)
				.first();
			const embed = new EmbedBuilder()
				.setColor(color.default)
				.setDescription(
					`${emojis.custom.heart1} **Thank you for adding me to your server!**\n ${emojis.custom.arrowright} If you need any help, please feel free to join\n ${emojis.custom.arrowright} our support server.\n\n ${emojis.custom.warning} **Important**\n ${emojis.custom.arrowright} Make sure the bot's role is at the highest position\n ${emojis.custom.arrowright} in the role hierarchy to prevent any bugs or issues.`
				)
				.setThumbnail(avatarURL);

			const channel = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setEmoji(emojis.custom.home)
					.setLabel('Support Server')
					.setURL('https://discord.gg/26R7kXa6dx')
					.setStyle(ButtonStyle.Link),

				new ButtonBuilder()
					.setEmoji(emojis.custom.link)
					.setLabel('Invite bot')
					.setURL('https://discord.com/api/oauth2/authorize?client_id=1200475110235197631&scope=applications.commands+bot&permissions=8')
					.setStyle(ButtonStyle.Link),

				new ButtonBuilder()
					.setEmoji(emojis.custom.gem)
					.setLabel('Vote')
					.setURL('https://top.gg/bot/1200475110235197631')
					.setStyle(ButtonStyle.Link)
			);

			const dmbot = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setEmoji(`${emojis.custom.home}`)
					.setLabel('Support Server')
					.setURL('https://discord.gg/26R7kXa6dx')
					.setStyle(ButtonStyle.Link),

				new ButtonBuilder()
					.setEmoji(`${emojis.custom.chart}`)
					.setLabel('Vote')
					.setURL('https://top.gg/bot/1200475110235197631')
					.setStyle(ButtonStyle.Link)
			);

			owner.send({ embeds: [embed], components: [dmbot] });
			topChannel.send({ embeds: [embed], components: [channel] });
		} catch (error) {
			guild.client.logger?.error?.(error);
		}
	}
}

module.exports = {
	UserEvent
};
