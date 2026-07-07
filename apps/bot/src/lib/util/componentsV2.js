const { SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } = require('discord.js');

const SEPARATOR_DIRECTIVE = /^\{separator(?::(small|large))?\}$/i;

function addTemplateText(container, content) {
	const lines = String(content || '').split('\n');
	let buffer = [];
	const flush = () => {
		const text = buffer.join('\n').trim();
		if (text) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
		buffer = [];
	};
	for (const line of lines) {
		const directive = line.trim().match(SEPARATOR_DIRECTIVE);
		if (!directive) {
			buffer.push(line);
			continue;
		}
		flush();
		container.addSeparatorComponents(
			new SeparatorBuilder().setDivider(true).setSpacing(directive[1]?.toLowerCase() === 'large' ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
		);
	}
	flush();
	return container;
}

module.exports = { SEPARATOR_DIRECTIVE, addTemplateText };
