const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { ChannelType, ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['ManageWebhooks'],
			description: 'Impersonate someone within the server using webhook'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('impersonate')
				.setDescription(this.description)
				.addUserOption((option) => option.setName('user').setDescription('The user you want to impersonate').setRequired(true))
				.addStringOption((option) => option.setName('message').setDescription('The message you want the user to say').setRequired(true))
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Sends this message to a specified channel')
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildText)
				)
		);
	}

	async chatInputRun(interaction) {
		try {
			const member = interaction.options.getUser('user');
			const message = interaction.options.getString('message');
			const channel = interaction.options.getChannel('channel');

			if (message.includes('@everyone') || message.includes('@here')) {
				return interaction.reply({
					components: [
						buildPanel(
							color.fail,
							`${emojis.custom.forbidden} **Mention Blocked**`,
							`${emojis.custom.arrowright} You cannot mention everyone or here with this command.`
						)
					],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				});
			}

			const webhook = await channel.createWebhook({
				name: member.username,
				avatar: member.displayAvatarURL({ extension: 'png', size: 128 })
			});

			await webhook.send({ content: message });
			setTimeout(() => webhook.delete().catch(() => null), 3000);

			await interaction.reply({
				components: [
					buildPanel(
						color.success,
						`${emojis.custom.success} **Impersonation Sent**`,
						`${emojis.custom.person} **User:** ${member}\n${emojis.custom.comment} **Channel:** ${channel}\n${emojis.custom.pencil} **Preview:** ${truncate(message, 180)}`
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
						`${emojis.custom.fail} **Impersonation Failed**`,
						`${emojis.custom.arrowright} I could not create or send through a webhook in that channel.`
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
