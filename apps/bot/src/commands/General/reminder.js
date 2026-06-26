const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const reminderSchema = require('../../lib/schemas/reminderSchema');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Get reminded so you don't have to yourself"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('remind')
				.setDescription(this.description)
				.addSubcommand((command) =>
					command
						.setName('set')
						.setDescription('Sets up a reminder for you.')
						.addStringOption((option) =>
							option.setName('reminder').setDescription("Specified reminder will be your reminder's reason.").setRequired(true)
						)
						.addIntegerOption((option) =>
							option
								.setName('minutes')
								.setDescription('Specify in how many minutes you want your reminder to be in.')
								.setRequired(true)
								.setMinValue(0)
								.setMaxValue(59)
						)
						.addIntegerOption((option) =>
							option
								.setName('hours')
								.setDescription('Specify in how many hours you want your reminder to be in.')
								.setMinValue(0)
								.setMaxValue(23)
								.setRequired(false)
						)
						.addIntegerOption((option) =>
							option
								.setName('days')
								.setDescription('Specify in how many days you want your reminder to be in.')
								.setMinValue(0)
								.setMaxValue(30)
								.setRequired(false)
						)
				)
				.addSubcommand((command) =>
					command
						.setName('cancel')
						.setDescription('Specified reminder will be cancelled.')
						.addStringOption((option) =>
							option
								.setName('id')
								.setDescription("Specified reminder will be cancelled. You must know the reminder's ID to do this.")
								.setMinLength(1)
								.setMaxLength(30)
								.setRequired(true)
						)
				)
				.addSubcommand((command) => command.setName('cancel-all').setDescription('Cancels all currently active reminders.'))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const sub = interaction.options.getSubcommand();

		if (sub === 'set') return this.setReminder(interaction);
		if (sub === 'cancel') return this.cancelReminder(interaction);
		if (sub === 'cancel-all') return this.cancelAllReminders(interaction);
	}

	async setReminder(interaction) {
		const reminder = interaction.options.getString('reminder');
		const minute = interaction.options.getInteger('minutes') || 0;
		const hour = interaction.options.getInteger('hours') || 0;
		const days = interaction.options.getInteger('days') || 0;
		const time = Date.now() + days * 86_400_000 + hour * 3_600_000 + minute * 60_000;
		const id = generateReminderId();

		await reminderSchema.create({
			User: interaction.user.id,
			Time: time,
			Remind: reminder,
			ID: id
		});

		await interaction.reply({
			components: [
				buildPanel(
					color.success,
					`${emojis.custom.success} **Reminder Set**`,
					[
						`${emojis.custom.calendar} **Time:** <t:${Math.floor(time / 1000)}:R>`,
						`${emojis.custom.mail} **Reminder:** ${reminder}`,
						`${emojis.custom.pencil} **Reminder ID:** \`${id}\``
					].join('\n')
				)
			],
			flags: MessageFlags.IsComponentsV2
		});
	}

	async cancelReminder(interaction) {
		const id = interaction.options.getString('id');
		const data = await reminderSchema.findOne({ User: interaction.user.id, ID: id });

		if (!data) {
			return interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **Reminder Not Found**`,
						`${emojis.custom.arrowright} No reminder found with ID \`${id}\`.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		await reminderSchema.deleteMany({
			User: interaction.user.id,
			ID: id
		});

		await interaction.reply({
			components: [
				buildPanel(
					color.success,
					`${emojis.custom.success} **Reminder Cancelled**`,
					`${emojis.custom.arrowright} Reminder \`${id}\` has been cancelled.`
				)
			],
			flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
		});
	}

	async cancelAllReminders(interaction) {
		const allData = await reminderSchema.find({ User: interaction.user.id });

		if (!allData.length) {
			return interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **No Reminders Found**`,
						`${emojis.custom.arrowright} You do not have any active reminders.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		await reminderSchema.deleteMany({ User: interaction.user.id });

		await interaction.reply({
			components: [
				buildPanel(
					color.success,
					`${emojis.custom.success} **Reminders Cancelled**`,
					`${emojis.custom.arrowright} Cancelled **${allData.length}** active reminder${allData.length === 1 ? '' : 's'}.`
				)
			],
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

function generateReminderId() {
	const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	return Array.from({ length: 16 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

module.exports = {
	UserCommand
};
