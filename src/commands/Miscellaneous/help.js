const fs = require('node:fs');
const path = require('node:path');
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
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	SectionBuilder
} = require('discord.js');

const commandsRoot = path.resolve(__dirname, '..');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Browse every Cadia command by category'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('help')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {
			const catalog = getCommandCatalog();
			const selectedCategory = catalog[0]?.id ?? 'overview';
			const componentId = `help:${interaction.id}:category`;

			const message = await interaction.reply({
				components: buildHelpComponents(interaction, catalog, selectedCategory, componentId),
				flags: MessageFlags.IsComponentsV2,
				withResponse: true
			});
			const responseMessage = message.resource?.message ?? (await interaction.fetchReply());

			const collector = responseMessage.createMessageComponentCollector({
				time: 180_000
			});

			collector.on('collect', async (i) => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({
						components: buildNoticeComponents(
							`${emojis.custom.forbidden} This help menu belongs to ${interaction.user}. Run \`/help\` to open your own.`
						),
						flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
					});
				}

				if (i.customId !== componentId) return;

				const categoryId = i.values[0];
				await i.update({
					components: buildHelpComponents(interaction, catalog, categoryId, componentId),
					flags: MessageFlags.IsComponentsV2
				});
			});

			collector.on('end', async () => {
				const currentCategory = catalog[0]?.id ?? 'overview';
				await interaction
					.editReply({
						components: buildHelpComponents(interaction, catalog, currentCategory, componentId, true),
						flags: MessageFlags.IsComponentsV2
					})
					.catch(() => null);
			});
		} catch (error) {
			console.error(error);
			return sendError(interaction);
		}
	}
}

function buildHelpComponents(interaction, catalog, selectedCategoryId, componentId, disabled = false) {
	const selectedCategory = catalog.find((category) => category.id === selectedCategoryId) ?? catalog[0];
	const totalCommands = catalog.reduce((total, category) => total + category.commands.length, 0);
	const visibleCommands = selectedCategory?.commands.slice(0, 18) ?? [];
	const hiddenCount = Math.max((selectedCategory?.commands.length ?? 0) - visibleCommands.length, 0);
	const inviteUrl = interaction.client.generateInvite({
		scopes: ['bot', 'applications.commands']
	});

	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`${emojis.custom.openfolder} **Cadia Command Center**\n` +
							`Browse **${totalCommands} commands** across **${catalog.length} categories**. Use the menu below to jump between command groups.`
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 })))
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${getCategoryIcon(selectedCategory?.name)} **${selectedCategory?.name ?? 'Commands'}**\n` +
					`${formatCommandList(visibleCommands)}` +
					(hiddenCount
						? `\n\n${emojis.custom.info} Showing the first **${visibleCommands.length}** commands. **${hiddenCount}** more are in this category.`
						: '')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`**Tip:** Start typing \`/\` in Discord to see options and required inputs for any command.`)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(componentId)
					.setPlaceholder('Choose a command category')
					.setDisabled(disabled)
					.addOptions(
						catalog.slice(0, 25).map((category) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(category.name)
								.setDescription(`${category.commands.length} command${category.commands.length === 1 ? '' : 's'}`)
								.setValue(category.id)
								.setEmoji(getCategoryEmojiName(category.name))
								.setDefault(category.id === selectedCategory?.id)
						)
					)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new ButtonBuilder().setLabel('Invite Cadia').setStyle(ButtonStyle.Link).setURL(inviteUrl),
				new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL('https://discord.gg/2XunevgrHD')
			)
		);

	return [container];
}

function buildNoticeComponents(message) {
	return [
		new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.fail.replace('#', ''), 16))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
	];
}

function getCommandCatalog() {
	return fs
		.readdirSync(commandsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const directory = path.join(commandsRoot, entry.name);
			const commands = getCommandFiles(directory)
				.map((file) => path.basename(file, '.js'))
				.sort((a, b) => a.localeCompare(b));

			return {
				id: entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
				name: entry.name,
				commands
			};
		})
		.filter((category) => category.commands.length)
		.sort((a, b) => a.name.localeCompare(b.name));
}

function getCommandFiles(directory) {
	const files = [];

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...getCommandFiles(fullPath));
		if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
	}

	return files;
}

function formatCommandList(commands) {
	if (!commands.length) return `${emojis.custom.warning} No commands were found in this category.`;

	return commands.map((command) => `${emojis.custom.arrowright} \`/${command}\``).join('\n');
}

function getCategoryIcon(name = '') {
	const icons = {
		Developer: emojis.custom.developer,
		Fun: emojis.custom.tada1,
		General: emojis.custom.comment,
		Information: emojis.custom.info,
		Miscellaneous: emojis.custom.compass,
		Moderation: emojis.custom.ban,
		Systems: emojis.custom.settings,
		Utility: emojis.custom.gem
	};

	return icons[name] ?? emojis.custom.openfolder;
}

function getCategoryEmojiName(name = '') {
	const emojisByCategory = {
		Developer: emojis.custom.developer,
		Fun: emojis.custom.tada1,
		General: emojis.custom.comment,
		Information: emojis.custom.info,
		Miscellaneous: emojis.custom.compass,
		Moderation: emojis.custom.ban,
		Systems: emojis.custom.settings,
		Utility: emojis.custom.gem
	};

	return emojisByCategory[name] ?? emojis.custom.openfolder;
}

async function sendError(interaction) {
	const response = {
		components: buildNoticeComponents(
			`${emojis.custom.fail} Oops, I could not load the help menu. Please try again later or use </bugreport:1219050295770742934>.`
		),
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	};

	if (interaction.replied || interaction.deferred) return interaction.followUp(response);
	return interaction.reply(response);
}

module.exports = {
	UserCommand
};
