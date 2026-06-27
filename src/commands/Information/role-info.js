const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Receive information regarding a role within the server'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('role-info')
				.setDescription(this.description)
				.addRoleOption((option) => option.setName('role').setDescription('Choose the role to acquire the details of.').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const role = interaction.options.getRole('role');

		if (!role?.id) {
			return interaction.reply({
				components: [buildNoticeContainer(`${emojis.custom.warning} The specified role does **not** exist!`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		if (role.name === '@everyone') {
			return interaction.reply({
				components: [buildNoticeContainer(`${emojis.custom.warning} The \`@everyone\` role cannot be inspected with this command.`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		const createdTime = Math.floor(role.createdTimestamp / 1000);
		const permissions = role.permissions.toArray();
		const visiblePermissions = permissions.slice(0, 12);
		const hiddenPermissions = Math.max(permissions.length - visiblePermissions.length, 0);
		const roleColor = role.color || Number.parseInt(color.default.replace('#', ''), 16);

		const container = new ContainerBuilder()
			.setAccentColor(roleColor)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`## ${emojis.custom.crown} ${role.name}\nRole profile, display settings, and permission summary.`)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`${emojis.custom.info} **Identity**`,
						`${emojis.custom.arrowright} **Name:** ${role.name}`,
						`${emojis.custom.arrowright} **Mention:** ${role}`,
						`${emojis.custom.arrowright} **Color:** ${role.hexColor}`,
						`${emojis.custom.arrowright} **Created:** <t:${createdTime}:R>`,
						'',
						`${emojis.custom.settings} **Settings**`,
						`${emojis.custom.arrowright} **Position:** ${role.position}`,
						`${emojis.custom.arrowright} **Hoisted:** ${formatBoolean(role.hoist)}`,
						`${emojis.custom.arrowright} **Mentionable:** ${formatBoolean(role.mentionable)}`,
						`${emojis.custom.arrowright} **Managed:** ${formatBoolean(role.managed)}`
					].join('\n')
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`### ${emojis.custom.lock} Key Permissions\n` +
						(visiblePermissions.length
							? visiblePermissions.map((permission) => `${emojis.custom.arrowright} \`${permission}\``).join('\n')
							: `${emojis.custom.arrowright} No elevated permissions.`) +
						(hiddenPermissions
							? `\n${emojis.custom.info} ${hiddenPermissions} more permission${hiddenPermissions === 1 ? '' : 's'} hidden.`
							: '')
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.pencil} Role ID: \`${role.id}\``));

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}
}

function buildNoticeContainer(message) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.warning.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(message));
}

function formatBoolean(value) {
	return value ? `Yes ${emojis.custom.success}` : `No ${emojis.custom.fail}`;
}

module.exports = {
	UserCommand
};
