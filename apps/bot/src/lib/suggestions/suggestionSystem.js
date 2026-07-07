const { randomUUID } = require('node:crypto');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	EmbedBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	TextInputStyle,
	ThumbnailBuilder
} = require('discord.js');
const { emojis } = require('../../config');
const { withTransaction } = require('../database/mysql');
const SuggestionConfig = require('../schemas/suggestionConfigSchema');
const Suggestion = require('../schemas/suggestionSchema');
const { normalizeSuggestionAppearance, renderTemplate } = require('./appearance');
const { getGuildCommandConfig, isModuleEnabled } = require('../runtime/guildCommandConfig');
const { addTemplateText } = require('../util/componentsV2');

const SUGGESTION_PREFIX = 'suggestions';
const SUGGESTION_COOLDOWN_MS = 5 * 60_000;
const voteQueues = new Map();

function buildSuggestionPanel(config = {}, guild = null) {
	if (typeof config === 'string') config = { style: config };
	const appearance = normalizeSuggestionAppearance(config);
	const panel = appearance.panel;
	const button = new ButtonBuilder()
		.setCustomId(`${SUGGESTION_PREFIX}:open`)
		.setLabel(panel.buttonLabel)
		.setStyle(ButtonStyle.Primary);
	if (panel.buttonEmoji) button.setEmoji(panel.buttonEmoji);
	const components = [
		new ActionRowBuilder().addComponents(button)
	];
	const allowedMentions = { parse: [] };

	if (appearance.style === 'message') {
		const content = [panel.title ? `**${panel.title}**` : '', panel.description, panel.footer ? `-# ${panel.footer}` : '']
			.filter(Boolean)
			.join('\n');
		return {
			content: content || 'Submit a suggestion below.',
			components,
			allowedMentions
		};
	}
	if (appearance.style === 'componentsV2') {
		const container = new ContainerBuilder().setAccentColor(Number.parseInt(panel.color.slice(1), 16));
		const header = panel.title ? `## ${panel.title}` : '## Submit a Suggestion';
		const thumbnail = resolveAsset(panel.thumbnailUrl, guild);
		if (thumbnail) container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(header)).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)));
		else container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));
		addTemplateText(container, panel.description || 'Submit a suggestion below.');
		const image = resolveAsset(panel.imageUrl, guild);
		if (image) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
		if (panel.footer) addTemplateText(container, `-# ${panel.footer}`);
		container.addActionRowComponents(components[0]);
		return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions };
	}

	const embed = new EmbedBuilder().setColor(panel.color);
	if (panel.title) embed.setTitle(panel.title);
	if (panel.description) embed.setDescription(panel.description);
	if (panel.footer) embed.setFooter({ text: panel.footer });
	if (resolveAsset(panel.thumbnailUrl, guild)) embed.setThumbnail(resolveAsset(panel.thumbnailUrl, guild));
	if (resolveAsset(panel.imageUrl, guild)) embed.setImage(resolveAsset(panel.imageUrl, guild));
	if (!panel.title && !panel.description && !panel.footer && !panel.thumbnailUrl && !panel.imageUrl) {
		embed.setDescription('Submit a suggestion below.');
	}

	return { embeds: [embed], components, allowedMentions };
}

function buildSuggestionModal() {
	return new ModalBuilder()
		.setCustomId(`${SUGGESTION_PREFIX}:submit`)
		.setTitle('Submit a Suggestion')
		.addComponents(
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('suggestion_title')
					.setLabel('Title / Subject')
					.setStyle(TextInputStyle.Short)
					.setMinLength(3)
					.setMaxLength(100)
					.setRequired(true)
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
					.setCustomId('suggestion_body')
					.setLabel('Your Suggestion')
					.setStyle(TextInputStyle.Paragraph)
					.setMinLength(10)
					.setMaxLength(1000)
					.setRequired(true)
			)
		);
}

function buildSuggestionPost(suggestion, config = {}, guild = null) {
	const upvotes = suggestion.upvotes?.length || 0;
	const downvotes = suggestion.downvotes?.length || 0;
	const post = normalizeSuggestionAppearance(config).post;
	const variables = {
		title: suggestion.title,
		body: suggestion.body,
		upvotes,
		downvotes,
		author: `<@${suggestion.authorId}>`,
		id: suggestion.suggestionId,
		status: suggestion.status || 'open'
	};
	const embed = new EmbedBuilder().setColor(post.color);
	const title = renderTemplate(post.title, variables, 256);
	const description = renderTemplate(post.description, variables, 4096);
	const footer = renderTemplate(post.footer, variables, 2048);
	if (title) embed.setTitle(title);
	if (description) embed.setDescription(description);
	if (footer) embed.setFooter({ text: footer });
	if (resolveAsset(post.thumbnailUrl, guild)) embed.setThumbnail(resolveAsset(post.thumbnailUrl, guild));
	if (resolveAsset(post.imageUrl, guild)) embed.setImage(resolveAsset(post.imageUrl, guild));
	if (post.showTimestamp) embed.setTimestamp(suggestion.createdAt || Date.now());
	if (!title && !description && !footer && !post.thumbnailUrl && !post.imageUrl) embed.setDescription(suggestion.body || 'Suggestion');
	const components = [
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`${SUGGESTION_PREFIX}:vote:${suggestion.suggestionId}:up`)
				.setEmoji(emojis.custom.upvote)
				.setLabel(`Upvote (${upvotes})`)
				.setStyle(ButtonStyle.Success)
				.setDisabled(suggestion.status !== 'open'),
			new ButtonBuilder()
				.setCustomId(`${SUGGESTION_PREFIX}:vote:${suggestion.suggestionId}:down`)
				.setEmoji(emojis.custom.downvote)
				.setLabel(`Downvote (${downvotes})`)
				.setStyle(ButtonStyle.Danger)
				.setDisabled(suggestion.status !== 'open')
		)
	];
	if (post.style === 'componentsV2') {
		const container = new ContainerBuilder().setAccentColor(Number.parseInt(post.color.slice(1), 16));
		const thumbnail = resolveAsset(post.thumbnailUrl, guild);
		const header = title ? `## ${title}` : '## Suggestion';
		if (thumbnail) container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(header)).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail)));
		else container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));
		addTemplateText(container, description || suggestion.body || 'Suggestion');
		const image = resolveAsset(post.imageUrl, guild);
		if (image) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
		if (footer || post.showTimestamp) addTemplateText(container, [footer ? `-# ${footer}` : '', post.showTimestamp ? `-# Created <t:${Math.floor((suggestion.createdAt || Date.now()) / 1000)}:F>` : ''].filter(Boolean).join('\n'));
		container.addActionRowComponents(components[0]);
		return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } };
	}

	return { embeds: [embed], components, allowedMentions: { parse: [] } };
}

async function handleSuggestionInteraction(interaction) {
	if (!interaction.inGuild?.()) return;
	const [, action] = interaction.customId.split(':');

	if (action === 'open' && interaction.isButton()) return openSuggestionModal(interaction);
	if (action === 'submit' && interaction.isModalSubmit()) return submitSuggestion(interaction);
	if (action === 'vote' && interaction.isButton()) return voteOnSuggestion(interaction);
}

async function openSuggestionModal(interaction) {
	return interaction.showModal(buildSuggestionModal());
}

async function submitSuggestion(interaction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const [config, commandConfig] = await Promise.all([
		SuggestionConfig.findOne({ guildId: interaction.guildId, channelId: interaction.channelId, enabled: true }),
		getGuildCommandConfig(interaction.guildId)
	]);
	if (!isModuleEnabled(commandConfig, 'suggestions')) return interaction.editReply('The suggestion module is disabled in this server.');
	if (!config) return interaction.editReply('Suggestions are no longer enabled in this channel.');

	const now = Date.now();
	const [latest] = await Suggestion.find({ guildId: interaction.guildId, authorId: interaction.user.id })
		.sort({ createdAt: -1 })
		.limit(1);
	const remainingMs = SUGGESTION_COOLDOWN_MS - (now - (latest?.createdAt || 0));
	if (remainingMs > 0) {
		return interaction.editReply(`Please wait **${formatRemainingTime(remainingMs)}** before submitting another suggestion.`);
	}
	const title = cleanInput(interaction.fields.getTextInputValue('suggestion_title'), 100);
	const body = cleanInput(interaction.fields.getTextInputValue('suggestion_body'), 1000);
	if (title.length < 3 || body.length < 10) {
		return interaction.editReply('Your suggestion needs a title of at least 3 characters and a description of at least 10 characters.');
	}

	const suggestion = await Suggestion.create({
		suggestionId: randomUUID(),
		guildId: interaction.guildId,
		channelId: interaction.channelId,
		authorId: interaction.user.id,
		title,
		body,
		createdAt: now,
		updatedAt: now
	});

	try {
		const message = await interaction.channel.send(buildSuggestionPost(suggestion, config, interaction.guild));
		suggestion.messageId = message.id;
		suggestion.updatedAt = Date.now();
		await suggestion.save();
	} catch (error) {
		await Suggestion.deleteOne({ suggestionId: suggestion.suggestionId }).catch(() => null);
		throw error;
	}

	return interaction.editReply(`${emojis.custom.success} Your suggestion has been submitted.`);
}

async function voteOnSuggestion(interaction) {
	const [, , suggestionId, voteType] = interaction.customId.split(':');
	if (!suggestionId || !['up', 'down'].includes(voteType)) return ephemeralReply(interaction, 'That vote control is invalid.');

	await interaction.deferUpdate();
	const commandConfig = await getGuildCommandConfig(interaction.guildId);
	if (!isModuleEnabled(commandConfig, 'suggestions')) {
		return interaction.followUp({ content: 'The suggestion module is disabled in this server.', flags: MessageFlags.Ephemeral });
	}
	return enqueueVote(suggestionId, async () => {
		const suggestion = await withTransaction(async () => {
			const current = await Suggestion.findOneForUpdate({ suggestionId });
			if (!current) return null;
			if (current.guildId !== interaction.guildId || current.channelId !== interaction.channelId) return null;
			if (current.messageId && current.messageId !== interaction.message.id) return null;
			if (current.status !== 'open') return current;

			applyVote(current, interaction.user.id, voteType);
			current.updatedAt = Date.now();
			await current.save();
			return current;
		});

		if (!suggestion) {
			return interaction.followUp({ content: 'This suggestion no longer exists.', flags: MessageFlags.Ephemeral });
		}
		if (suggestion.status !== 'open') {
			return interaction.followUp({ content: 'Voting on this suggestion is closed.', flags: MessageFlags.Ephemeral });
		}

		const config = await SuggestionConfig.findOne({ guildId: suggestion.guildId });
		return interaction.message.edit(buildSuggestionPost(suggestion, config || {}, interaction.guild));
	});
}

function applyVote(suggestion, userId, voteType) {
	suggestion.upvotes = [...new Set(suggestion.upvotes || [])].filter((id) => id !== userId);
	suggestion.downvotes = [...new Set(suggestion.downvotes || [])].filter((id) => id !== userId);
	if (voteType === 'up') suggestion.upvotes.push(userId);
	if (voteType === 'down') suggestion.downvotes.push(userId);
	return suggestion;
}

function enqueueVote(suggestionId, operation) {
	const previous = voteQueues.get(suggestionId) || Promise.resolve();
	const current = previous.catch(() => null).then(operation);
	voteQueues.set(suggestionId, current);
	return current.finally(() => {
		if (voteQueues.get(suggestionId) === current) voteQueues.delete(suggestionId);
	});
}

function cleanInput(value, maxLength) {
	return String(value || '')
		.replace(/\r\n?/g, '\n')
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.trim()
		.slice(0, maxLength);
}

function formatRemainingTime(milliseconds) {
	const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function ephemeralReply(interaction, content) {
	return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

function resolveAsset(value, guild) {
	if (value === '{serverIcon}') return guild?.iconURL?.({ size: 1024 }) || '';
	return value || '';
}

module.exports = {
	SUGGESTION_COOLDOWN_MS,
	SUGGESTION_PREFIX,
	applyVote,
	buildSuggestionModal,
	buildSuggestionPanel,
	buildSuggestionPost,
	cleanInput,
	handleSuggestionInteraction
};
