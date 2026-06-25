const fs = require('node:fs');
const path = require('node:path');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { branding, color, emojis } = require('../../config');
const { createInviteUrl } = require('../../config/invite');
const { commandMention } = require('../../lib/util/commandMentions');
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
const rpgCommandNames = [
	'rpg create',
	'rpg profile',
	'rpg id',
	'rpg tutorial',
	'rpg quest',
	'rpg travel',
	'rpg adventure',
	'rpg inventory',
	'rpg equip',
	'rpg leaderboard',
	'rpg achievements',
	'rpg badge',
	'rpg server-boss',
	'rpg season',
	'rpg refer',
	'rpg bestiary',
	'rpg delete',
	'rpg admin find',
	'rpg admin inspect',
	'rpg admin add-currency',
	'rpg admin add-item',
	'rpg admin wipe',
	'rpg admin max',
	'rpg admin boss',
	'rpg admin analytics'
];
const commandCatalog = buildCommandCatalog();

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
			const selectedCategory = catalog.find((category) => category.id === 'rpg')?.id ?? catalog[0]?.id ?? 'overview';
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
							`${emojis.custom.forbidden} This help menu belongs to ${interaction.user}. Run ${commandMention('help')} to open your own.`
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
				await interaction
					.editReply({
						components: buildHelpComponents(interaction, catalog, selectedCategory, componentId, true),
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
	const inviteUrl = createInviteUrl(interaction.client);

	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`${emojis.custom.openfolder} **Cadia Command Center**\n` +
							`-# Cadia v${branding.version} · Slash commands and \`cd\` prefix commands\n` +
							`${emojis.custom.rpguser} Begin with ${commandMention('rpg tutorial')} or \`cd rpg tutorial\`.\n` +
							`Browse **${totalCommands} commands** across the RPG and **Community Tools** categories below.`
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
			new TextDisplayBuilder().setContent(
				`**Prefix:** Use \`cd command\`. For options, use positional values or \`name=value\`, such as \`cd rpg create name="Aster" class=warden origin=gateborn\`.\n` +
					`**Tip:** Slash commands still provide Discord's guided option menus.`
			)
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
				new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(branding.supportServerUrl)
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
	return commandCatalog;
}

function buildCommandCatalog() {
	const categories = fs
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

	if (fs.existsSync(path.join(commandsRoot, 'Systems', 'RPG System', 'rpg.js'))) {
		categories.unshift({
			id: 'rpg',
			name: 'RPG - Start Here',
			commands: rpgCommandNames
		});
	}

	return categories;
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

	return commands.map((command) => `${emojis.custom.arrowright} ${commandMention(command)} · \`cd ${command}\``).join('\n');
}

function getCategoryIcon(name = '') {
	const icons = {
		Developer: emojis.custom.developer,
		Fun: emojis.custom.tada1,
		General: emojis.custom.comment,
		Information: emojis.custom.info,
		Miscellaneous: emojis.custom.compass,
		Moderation: emojis.custom.ban,
		'RPG - Start Here': emojis.custom.rpguser,
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
		'RPG - Start Here': emojis.custom.rpguser,
		Systems: emojis.custom.settings,
		Utility: emojis.custom.gem
	};

	return emojisByCategory[name] ?? emojis.custom.openfolder;
}

async function sendError(interaction) {
	const response = {
		components: buildNoticeComponents(
			`${emojis.custom.fail} Oops, I could not load the help menu. Please try again later or use ${commandMention('bug-report')}.`
		),
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	};

	if (interaction.replied || interaction.deferred) return interaction.followUp(response);
	return interaction.reply(response);
}

module.exports = {
	UserCommand,
	buildHelpComponents,
	getCommandCatalog
};
