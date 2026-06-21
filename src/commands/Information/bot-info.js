const os = require('node:os');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { branding, color, emojis } = require('../../config');
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
	ThumbnailBuilder,
	version
} = require('discord.js');
const { isMysqlConnected } = require('../../lib/database/mysql');
const { createInviteUrl } = require('../../config/invite');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Receive information regarding Cadia'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('bot-info')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const databaseStatus = isMysqlConnected() ? `${emojis.custom.online} Connected` : `${emojis.custom.offline} Disconnected`;
		const developers = 'Malik, Oreo & Navin';
		const commandCount = this.container.stores.get('commands').size;
		const uptime = formatUptime(interaction.client.uptime);
		const system = os.type().replace('Windows_NT', 'Windows').replace('Darwin', 'macOS');
		const inviteUrl = createInviteUrl(interaction.client);

		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`## ${emojis.custom.rpguser} Cadia RPG\n` +
								`${branding.tagline}. Begin with \`/rpg tutorial\`; moderation and utilities support the communities playing it.`
						)
					)
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 })))
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`${emojis.custom.emoji1} **Client**`,
						`${emojis.custom.arrowright} **Tag:** ${interaction.client.user.tag}`,
						`${emojis.custom.arrowright} **Created:** 26/01/2024`,
						`${emojis.custom.arrowright} **Developers:** ${developers}`,
						'',
						`${emojis.custom.connected} **Runtime**`,
						`${emojis.custom.arrowright} **Uptime:** ${uptime}`,
						`${emojis.custom.arrowright} **Latency:** ${Math.round(interaction.client.ws.ping)}ms`,
						`${emojis.custom.arrowright} **Database:** ${databaseStatus}`
					].join('\n')
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`${emojis.custom.settings} **Platform**`,
						`${emojis.custom.arrowright} **System:** ${system}`,
						`${emojis.custom.arrowright} **Node.js:** ${process.version}`,
						`${emojis.custom.arrowright} **Discord.js:** v${version}`,
						'',
						`${emojis.custom.compass} **Reach**`,
						`${emojis.custom.arrowright} **Commands:** ${commandCount}`,
						`${emojis.custom.arrowright} **Servers:** ${interaction.client.guilds.cache.size}`,
						`${emojis.custom.arrowright} **Users:** ${interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`
					].join('\n')
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.person} Requested by **${interaction.user.displayName}**`))
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setLabel('Invite Cadia').setStyle(ButtonStyle.Link).setURL(inviteUrl),
					new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(branding.supportServerUrl)
				)
			);

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

function formatUptime(uptime) {
	const days = Math.floor(uptime / 86_400_000);
	const hours = Math.floor(uptime / 3_600_000) % 24;
	const minutes = Math.floor(uptime / 60_000) % 60;
	const seconds = Math.floor(uptime / 1_000) % 60;

	return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
	UserCommand
};
