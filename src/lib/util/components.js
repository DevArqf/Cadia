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
const { color, emojis } = require('../../config');

function accent(hex = color.default) {
	return Number.parseInt(hex.replace('#', ''), 16);
}

function panel({ accentColor = color.default, title, subtitle, sections = [], footer, buttons = [] }) {
	const container = new ContainerBuilder()
		.setAccentColor(accent(accentColor))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title}${subtitle ? `\n-# ${subtitle}` : ''}`));

	for (const section of sections.filter(Boolean)) {
		container
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(Array.isArray(section) ? section.join('\n') : section));
	}

	if (footer) {
		container
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
	}

	if (buttons.length) {
		container.addActionRowComponents(new ActionRowBuilder().addComponents(...buttons));
	}

	return container;
}

function linkButton(label, url, emoji = emojis.custom.link) {
	return new ButtonBuilder().setLabel(label).setEmoji(emoji).setStyle(ButtonStyle.Link).setURL(url);
}

function actionButton(customId, label, style = ButtonStyle.Secondary, emoji) {
	const button = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
	if (emoji) button.setEmoji(emoji);
	return button;
}

function notice(title, message, accentColor = color.fail) {
	return panel({
		accentColor,
		title,
		sections: [message],
		footer: false
	});
}

function componentReply(components, ephemeral = false) {
	return {
		components: Array.isArray(components) ? components : [components],
		flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
	};
}

module.exports = {
	actionButton,
	componentReply,
	linkButton,
	notice,
	panel
};
