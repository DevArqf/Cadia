const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionFlagsBits, ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');
const { color, emojis } = require('../../config');
const { UserSettingsSchema } = require('../../lib/schemas/usersettingSchema');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Send a Anonymous DM to a user within the server'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('dm')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('send')
						.setDescription('Send a direct message to a user')
						.addUserOption((option) => option.setName('user').setDescription('The user that should receive a DM').setRequired(true))
						.addStringOption((option) =>
							option.setName('message').setDescription('The message that the user should receive').setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('toggle')
						.setDescription('Toggle to receive DMs or not')
						.addStringOption((option) =>
							option
								.setName('action')
								.setDescription('Choose to opt-in or opt-out of receiving DMs')
								.setRequired(true)
								.addChoices({ name: 'opt-out', value: 'opt-out' }, { name: 'opt-in', value: 'opt-in' })
						)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'send') return this.sendDm(interaction);
		if (subcommand === 'toggle') return this.toggleDms(interaction);
	}

	async sendDm(interaction) {
		const user = interaction.options.getUser('user');
		const message = interaction.options.getString('message');
		const userSettings = await UserSettingsSchema.findOne({ userId: user.id });

		if (userSettings && !userSettings.receiveDMs) {
			return interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **DM Blocked**`,
						`${emojis.custom.arrowright} **${user.tag}** has opted out and cannot receive command DMs.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		try {
			await user.send({
				components: [
					buildPanel(
						color.default,
						`${emojis.custom.mail} **DM Received**`,
						[
							`${emojis.custom.pencil} **Message:** ${message}`,
							`${emojis.custom.home} **Server:** ${interaction.guild.name}`,
							`${emojis.custom.person} **Author:** ${interaction.user}`
						].join('\n')
					)
				],
				flags: MessageFlags.IsComponentsV2
			});

			await interaction.reply({
				components: [
					buildPanel(
						color.success,
						`${emojis.custom.success} **DM Sent**`,
						`${emojis.custom.arrowright} Your message was delivered to **${user.tag}**.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		} catch {
			await interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **DM Failed**`,
						`${emojis.custom.arrowright} **${user.tag}** has Direct Messages disabled or cannot be reached.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}

	async toggleDms(interaction) {
		const action = interaction.options.getString('action');
		const receiveDMs = action === 'opt-in';
		let userSettings = await UserSettingsSchema.findOne({ userId: interaction.user.id });

		if (!userSettings) {
			userSettings = new UserSettingsSchema({ userId: interaction.user.id, receiveDMs });
		} else {
			userSettings.receiveDMs = receiveDMs;
		}

		await userSettings.save();

		await interaction.reply({
			components: [
				buildPanel(
					color.success,
					`${emojis.custom.success} **DM Preference Updated**`,
					receiveDMs
						? `${emojis.custom.arrowright} You can now receive Direct Messages from this command.`
						: `${emojis.custom.arrowright} You will no longer receive Direct Messages from this command.`
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

module.exports = {
	UserCommand
};
