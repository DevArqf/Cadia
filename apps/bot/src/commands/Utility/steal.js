const { default: axios } = require('axios');
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
			requiredUserPermissions: ['ManageGuildExpressions'],
			description: 'Steal emojis to add to your own server'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('steal')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('emoji').setDescription('The emoji you want to add to the server').setRequired(true))
				.addStringOption((option) => option.setName('name').setDescription('The name for your emoji').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			let emoji = interaction.options.getString('emoji')?.trim();
			const name = interaction.options.getString('name');

			if (emoji.startsWith('<') && emoji.endsWith('>')) {
				const id = emoji.match(/\d{15,}/g)?.[0];
				if (id) emoji = await getEmojiUrl(id);
			}

			if (!emoji?.startsWith('https')) {
				return interaction.reply({
					components: [
						buildStatusContainer(
							color.fail,
							`${emojis.custom.fail} **Emoji Cannot Be Stolen**`,
							`${emojis.custom.arrowright} Default Discord emojis cannot be uploaded as server emojis.`
						)
					],
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
				});
			}

			const createdEmoji = await interaction.guild.emojis.create({
				attachment: emoji,
				name
			});

			const container = buildStatusContainer(
				color.success,
				`${emojis.custom.success} **Emoji Stolen**`,
				[
					`${emojis.custom.emoji1} **Emoji:** ${createdEmoji}`,
					`${emojis.custom.pencil} **Name:** \`${createdEmoji.name}\``,
					`${emojis.custom.person} **Added by:** ${interaction.user}`
				].join('\n')
			).addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setLabel('Open Emoji').setStyle(ButtonStyle.Link).setURL(createdEmoji.imageURL())
				)
			);

			await interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error(error);

			await interaction.reply({
				components: [
					buildStatusContainer(
						color.fail,
						`${emojis.custom.fail} **Emoji Steal Failed**`,
						`${emojis.custom.arrowright} I could not add that emoji. The server may be full, the image may be invalid, or I may be missing permissions.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

async function getEmojiUrl(id) {
	const type = await axios
		.get(`https://cdn.discordapp.com/emojis/${id}.gif`)
		.then(() => 'gif')
		.catch(() => 'png');

	return `https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless`;
}

function buildStatusContainer(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

module.exports = {
	UserCommand
};
