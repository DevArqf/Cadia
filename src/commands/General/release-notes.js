const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const { color, emojis } = require('../../config');
const { ReleaseNotesSchema } = require('../../lib/schemas/releasenoteSchema');
const { isDeveloper } = require('../../lib/util/authorization');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Release Note'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('release-notes')
				.setDescription(this.description)
				.addSubcommand((command) =>
					command
						.setName('publish')
						.setDescription('Add new release notes')
						.addStringOption((option) => option.setName('updated-notes').setDescription('The notes to publish').setRequired(true))
				)
				.addSubcommand((command) => command.setName('view').setDescription('View the most recent release notes'))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const sub = interaction.options.getSubcommand();
		const data = await ReleaseNotesSchema.find();

		if (sub === 'publish') {
			if (!isDeveloper(interaction.user.id)) {
				return interaction.reply({
					components: [
						buildPanel(
							color.fail,
							`${emojis.custom.forbidden} **Not Authorized**`,
							`${emojis.custom.arrowright} You cannot publish release notes.`
						)
					],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				});
			}

			const update = interaction.options.getString('updated-notes');
			const formattedUpdate = update.split(', ').join('\n');
			const version = data.length ? Math.round((data.reduce((total, value) => total + value.Version, 0) + 0.1) * 10) / 10 : 1.0;

			if (data.length > 0) await ReleaseNotesSchema.deleteMany();
			await ReleaseNotesSchema.create({ Updates: formattedUpdate, Date: Date.now(), Developer: interaction.user.username, Version: version });

			return interaction.reply({
				components: [
					buildPanel(
						color.success,
						`${emojis.custom.success} **Release Notes Published**`,
						`${emojis.custom.update} **Version:** \`${version}\`\n${emojis.custom.developer} **Developer:** ${interaction.user.username}`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		if (data.length === 0) {
			return interaction.reply({
				components: [
					buildPanel(
						color.warning,
						`${emojis.custom.warning} **No Release Notes**`,
						`${emojis.custom.arrowright} There are no public release notes yet.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		const latest = data.at(-1);
		const updates = latest.Updates.split('\n').filter(Boolean);
		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${emojis.custom.update} **Release Notes**\n${emojis.custom.arrowright} Version \`${latest.Version}\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					updates.map((item) => `${emojis.custom.success} ${item}`).join('\n') || `${emojis.custom.info} No notes provided.`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${emojis.custom.developer} **Developer:** \`${latest.Developer}\`\n${emojis.custom.calendar} **Published:** <t:${Math.floor(latest.Date / 1000)}:R>`
				)
			);

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}
}

function buildPanel(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

module.exports = {
	UserCommand
};
