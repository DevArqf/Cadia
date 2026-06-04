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
			description: 'Receive information of a user within the server'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('user-info')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user you want to view information of').setRequired(false))
				.addStringOption((option) =>
					option.setName('id').setDescription('If the user has left, you can enter the user ID').setRequired(false)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const userOption = interaction.options.getUser('user');
			const idOption = interaction.options.getString('id');
			const user = userOption ?? (idOption ? await interaction.client.users.fetch(idOption) : interaction.user);
			const member = await interaction.guild.members.fetch(user.id).catch(() => null);
			const userAvatar = user.displayAvatarURL({ extension: 'png', size: 2048 });
			const createdTime = Math.floor(user.createdTimestamp / 1000);
			const joinedTime = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
			const visibleRoles = member
				? member.roles.cache.filter((role) => role.id !== interaction.guild.id).sort((a, b) => b.position - a.position)
				: null;
			const roleMentions = visibleRoles?.map((role) => `${role}`).slice(0, 12) ?? [];
			const hiddenRoleCount = Math.max((visibleRoles?.size ?? 0) - roleMentions.length, 0);

			const container = new ContainerBuilder()
				.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
				.addSectionComponents(
					new SectionBuilder()
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(
								`## ${emojis.custom.person} ${user.tag}\nUser identity, server membership, and role summary.`
							)
						)
						.setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						[
							`${emojis.custom.info} **Profile**`,
							`${emojis.custom.arrowright} **User:** ${user}`,
							`${emojis.custom.arrowright} **Bot:** ${formatBoolean(user.bot)}`,
							`${emojis.custom.arrowright} **Joined Discord:** <t:${createdTime}:R>`,
							'',
							`${emojis.custom.community} **Server**`,
							`${emojis.custom.arrowright} **Member:** ${member ? 'In server' : 'Not in server'} ${member ? emojis.custom.success : emojis.custom.fail}`,
							`${emojis.custom.arrowright} **Joined Server:** ${joinedTime ? `<t:${joinedTime}:R>` : 'Unavailable'}`,
							`${emojis.custom.arrowright} **Highest Role:** ${member?.roles.highest && member.roles.highest.id !== interaction.guild.id ? member.roles.highest : 'None'}`
						].join('\n')
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`### ${emojis.custom.openfolder} Roles\n` +
							(roleMentions.length ? roleMentions.join(' ') : `${emojis.custom.arrowright} No roles to display.`) +
							(hiddenRoleCount ? `\n${emojis.custom.info} ${hiddenRoleCount} more role${hiddenRoleCount === 1 ? '' : 's'} hidden.` : '')
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.pencil} User ID: \`${user.id}\``))
				.addActionRowComponents(
					new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Avatar').setStyle(ButtonStyle.Link).setURL(userAvatar))
				);

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

function formatBoolean(value) {
	return value ? `Yes ${emojis.custom.success}` : `No ${emojis.custom.fail}`;
}

function buildErrorContainer() {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.fail} Oops, I could not load that user profile. Please try again later or use </bugreport:1219050295770742934>.`
			)
		);
}

module.exports = {
	UserCommand
};
