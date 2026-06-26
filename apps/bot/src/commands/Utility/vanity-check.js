const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Check to see if a vanity url is already taken or not'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('vanity-check')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('vanity').setDescription('The vanity to check').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const vanity = interaction.options.getString('vanity');
		const invite = await interaction.client.fetchInvite(vanity).catch(() => null);

		if (!invite?.guild?.vanityURLCode || invite.guild.vanityURLCode !== vanity) {
			return interaction.reply({
				components: [buildAvailableContainer(vanity)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		await interaction.reply({
			components: [buildTakenContainer(vanity, invite)],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

function buildAvailableContainer(vanity) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.success.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.success} **Vanity Available**\n${emojis.custom.arrowright} \`discord.gg/${vanity}\` does not appear to be held by a server.`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`${emojis.custom.info} Availability can change at any time if another server claims it.`)
		);
}

function buildTakenContainer(vanity, invite) {
	const description = invite.guild.description || 'None';

	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.warning.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${emojis.custom.warning} **Vanity Taken**\n${emojis.custom.arrowright} \`discord.gg/${vanity}\` is already attached to a server.`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`${emojis.custom.compass} **Server:** ${invite.guild.name}`,
					`${emojis.custom.person} **Members:** ${invite.memberCount}`,
					`${emojis.custom.pencil} **Server ID:** \`${invite.guild.id}\``,
					`${emojis.custom.comment} **Description:** ${description}`
				].join('\n')
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder().setLabel('Open Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.gg/${vanity}`)
			)
		);
}

module.exports = {
	UserCommand
};
