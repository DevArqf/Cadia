const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder , MessageFlags} = require('discord.js');

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
			const server_made = new Date(String(interaction.guild.createdAt)).getTime() / 1000;
			const server_icon = interaction.guild.iconURL({ dynamic: true, format: 'png', size: 256 });

			const emoji_reg = interaction.guild.emojis.cache.filter((emoji) => !emoji.animated).size;
			const emoji_animated = interaction.guild.emojis.cache.filter((emoji) => emoji.animated).size;
			const boostLevel = interaction.guild.premiumTier;
			const maxEmojis = 50 + boostLevel * 50;

			const embed = new EmbedBuilder()
				.setColor(color.default)
				.addFields(
					{
						name: `${emojis.custom.home} \`-\` **Server Name:**`,
						value: `${emojis.custom.arrowright} **${interaction.guild.name}**`,
						inline: true
					},
					{
						name: `${emojis.custom.crown} \`-\` **Founder:**`,
						value: `${emojis.custom.arrowright} ${await interaction.guild.fetchOwner()}`,
						inline: true
					},
					{ name: `${emojis.custom.boost} \`-\` **Boost Tier:**`, value: `${emojis.custom.arrowright} **${boostLevel}**`, inline: true },
					{
						name: `${emojis.custom.friends} \`-\` **Members:**`,
						value: `${emojis.custom.arrowright} **${interaction.guild.memberCount}**`,
						inline: true
					},
					{
						name: `${emojis.custom.comment} \`-\` **Channels:**`,
						value: `${emojis.custom.arrowright} **${interaction.guild.channels.cache.size}**`,
						inline: true
					},
					{
						name: `${emojis.custom.pencil} \`-\` **Roles:**`,
						value: `${emojis.custom.arrowright} **${interaction.guild.roles.cache.size}**`,
						inline: true
					},
					{
						name: `${emojis.custom.link} \`-\` **Server Icon:**`,
						value: `${emojis.custom.arrowright} ${server_icon ? `[Click Here](${server_icon})` : '**None**'}`,
						inline: true
					},
					{
						name: `${emojis.custom.clock} \`-\` **Created Date:**`,
						value: `${emojis.custom.arrowright} <t:${server_made}:R>`,
						inline: true
					},
					{
						name: `${emojis.custom.openfolder} \`-\` **Emoji Count:**`,
						value: `${emojis.custom.arrowright} **${maxEmojis}**`,
						inline: true
					},
					{
						name: `${emojis.custom.emoji1} \`-\` **Regular Emojis:**`,
						value: `${emojis.custom.arrowright} **${emoji_reg}/${maxEmojis}**`,
						inline: true
					},
					{
						name: `${emojis.custom.emoji2} \`-\` **Animated Emojis:**`,
						value: `${emojis.custom.arrowright} **${emoji_animated}/${maxEmojis}**`,
						inline: true
					}
				)
				.setTimestamp()
				.setThumbnail(server_icon ? server_icon : null)
				.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });

			await interaction.reply({
				embeds: [embed]
			});
		} catch (error) {
			console.error(error);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(
					`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`
				)
				.setTimestamp();

			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
			return;
		}
	}
}

module.exports = {
	UserCommand
};
