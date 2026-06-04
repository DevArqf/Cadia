const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder
} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Get information about the server'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('server-info')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const owner = await interaction.guild.fetchOwner();
			const serverCreated = Math.floor(interaction.guild.createdTimestamp / 1000);
			const serverIcon = interaction.guild.iconURL({ extension: 'png', size: 256 });
			const regularEmojis = interaction.guild.emojis.cache.filter((emoji) => !emoji.animated).size;
			const animatedEmojis = interaction.guild.emojis.cache.filter((emoji) => emoji.animated).size;
			const boostLevel = interaction.guild.premiumTier;
			const maxEmojis = 50 + boostLevel * 50;

			const container = new ContainerBuilder().setAccentColor(Number.parseInt(color.default.replace('#', ''), 16));

			addHeader(container, interaction.guild.name, serverIcon);

			container
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						[
							`${emojis.custom.home} **Server**`,
							`${emojis.custom.arrowright} **Name:** ${interaction.guild.name}`,
							`${emojis.custom.arrowright} **Founder:** ${owner}`,
							`${emojis.custom.arrowright} **Created:** <t:${serverCreated}:R>`,
							'',
							`${emojis.custom.community} **Community**`,
							`${emojis.custom.arrowright} **Members:** ${interaction.guild.memberCount}`,
							`${emojis.custom.arrowright} **Channels:** ${interaction.guild.channels.cache.size}`,
							`${emojis.custom.arrowright} **Roles:** ${interaction.guild.roles.cache.size}`
						].join('\n')
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						[
							`${emojis.custom.boost} **Perks**`,
							`${emojis.custom.arrowright} **Boost Tier:** ${boostLevel}`,
							`${emojis.custom.arrowright} **Emoji Slots:** ${maxEmojis}`,
							`${emojis.custom.arrowright} **Regular Emojis:** ${regularEmojis}/${maxEmojis}`,
							`${emojis.custom.arrowright} **Animated Emojis:** ${animatedEmojis}/${maxEmojis}`
						].join('\n')
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${emojis.custom.person} Requested by **${interaction.user.displayName}**`)
				);

			if (serverIcon) {
				container.addActionRowComponents(
					new ActionRowBuilder().addComponents(
						new ButtonBuilder().setLabel('Open Server Icon').setStyle(ButtonStyle.Link).setURL(serverIcon)
					)
				);
			}

			await interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(error);

			await interaction.reply({
				components: [buildErrorContainer()],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

function addHeader(container, guildName, serverIcon) {
	const header = new TextDisplayBuilder().setContent(
		`## ${emojis.custom.compass} ${guildName}\n` + 'Server profile, community counts, and boost resources in one place.'
	);

	if (!serverIcon) {
		container.addTextDisplayComponents(header);
		return;
	}

	container.addSectionComponents(
		new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(serverIcon))
	);
}

function buildErrorContainer() {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.fail} Oops, I could not load the server profile. Please try again later or use </bugreport:1219050295770742934>.`
			)
		);
}

module.exports = {
	UserCommand
};
