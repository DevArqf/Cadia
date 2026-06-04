const { Listener, Events } = require('@sapphire/framework');
const { ButtonStyle, ActionRowBuilder, ButtonBuilder, Guild, EmbedBuilder, ChannelType , MessageFlags} = require('discord.js');
const { color, emojis } = require('../config');

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
					.setURL('https://discord.gg/SrYexYcKZ2')
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
					.setURL('https://discord.gg/SrYexYcKZ2')
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
			console.error(error);
			const errorEmbed = new EmbedBuilder()
            	.setColor(color.fail)
            	.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
            	.setTimestamp();
			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });	
		}
	}
}

module.exports = {
	UserEvent
};
