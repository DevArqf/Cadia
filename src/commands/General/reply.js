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
			requiredUserPermissions: ['ManageMessages'],
			description: 'Reply to a message from another user'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('reply')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('message-id').setDescription('The message ID of the user').setRequired(true))
				.addStringOption((option) => option.setName('text').setDescription('Your reply message').setRequired(true))
				.addBooleanOption((option) => option.setName('embed').setDescription('Would you want your reply embedded or not?').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const messageId = interaction.options.getString('message-id');
			const content = interaction.options.getString('text');
			const embedded = interaction.options.getBoolean('embed');

			if (messageId.startsWith('http')) {
				return interaction.reply({
					components: [
						buildPanel(
							color.fail,
							`${emojis.custom.fail} **Message ID Required**`,
							`${emojis.custom.arrowright} Paste only the message ID, not the full message link.`
						)
					],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				});
			}

			const targetMessage = await interaction.channel.messages.fetch(messageId);

			if (embedded) {
				await targetMessage.reply({
					components: [buildPanel(color.default, `${emojis.custom.comment} **Reply**`, content)],
					flags: MessageFlags.IsComponentsV2
				});
			} else {
				await targetMessage.reply({ content });
			}

			await interaction.reply({
				components: [
					buildPanel(
						color.success,
						`${emojis.custom.success} **Reply Sent**`,
						[
							`${emojis.custom.link} **Message:** https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${messageId}`,
							`${emojis.custom.pencil} **Embedded:** ${embedded ? 'Yes' : 'No'}`,
							`${emojis.custom.comment} **Preview:** ${truncate(content, 180)}`
						].join('\n')
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		} catch (error) {
			console.error(error);

			await interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **Reply Failed**`,
						`${emojis.custom.arrowright} I could not find or reply to that message in this channel.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

function buildPanel(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

function truncate(value, maxLength) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

module.exports = {
	UserCommand
};
