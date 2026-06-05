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
const math = require('mathjs');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Use a calculator to calculate maths'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('calculator')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const idPrefix = `calculator:${interaction.id}`;
		let expression = '';
		let note = 'Results will be displayed here.';
		const rows = buildKeypad(idPrefix);

		const response = await interaction.reply({
			components: [buildCalculatorContainer(expression, note, rows)],
			flags: MessageFlags.IsComponentsV2,
			withResponse: true
		});
		const message = response.resource?.message ?? (await interaction.fetchReply());
		const collector = message.createMessageComponentCollector({
			filter: (i) => i.user.id === interaction.user.id,
			time: 600_000
		});

		collector.on('collect', async (i) => {
			const value = i.customId.slice(`${idPrefix}:`.length);
			note = '';

			if (value === '=') {
				try {
					expression = math.evaluate(expression || '0').toString();
					note = 'Calculated successfully.';
				} catch {
					expression = '';
					note = 'Invalid expression. Press AC and try again.';
				}
			} else if (value === 'clear') {
				expression = '';
				note = 'Results will be displayed here.';
			} else if (value === 'backspace') {
				expression = expression.slice(0, -1);
				if (!expression) note = 'Results will be displayed here.';
			} else {
				expression = appendValue(expression, value);
			}

			await i.update({
				components: [buildCalculatorContainer(expression, note, rows)],
				flags: MessageFlags.IsComponentsV2
			});
		});

		collector.on('end', async () => {
			await interaction
				.editReply({
					components: [buildCalculatorContainer(expression, 'Calculator closed.', buildKeypad(idPrefix, true))],
					flags: MessageFlags.IsComponentsV2
				})
				.catch(() => null);
		});
	}
}

function buildCalculatorContainer(expression, note, rows) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.settings} **Calculator**`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\`\n${expression || note}\n\`\`\``))
		.addActionRowComponents(...rows);
}

function buildKeypad(idPrefix, disabled = false) {
	const layout = [
		[
			['AC', 'clear', ButtonStyle.Danger],
			['(', '(', ButtonStyle.Secondary],
			[')', ')', ButtonStyle.Secondary],
			['<=', 'backspace', ButtonStyle.Secondary]
		],
		[
			['1', '1', ButtonStyle.Secondary],
			['2', '2', ButtonStyle.Secondary],
			['3', '3', ButtonStyle.Secondary],
			['/', '/', ButtonStyle.Primary]
		],
		[
			['4', '4', ButtonStyle.Secondary],
			['5', '5', ButtonStyle.Secondary],
			['6', '6', ButtonStyle.Secondary],
			['*', '*', ButtonStyle.Primary]
		],
		[
			['7', '7', ButtonStyle.Secondary],
			['8', '8', ButtonStyle.Secondary],
			['9', '9', ButtonStyle.Secondary],
			['-', '-', ButtonStyle.Primary]
		],
		[
			['0', '0', ButtonStyle.Secondary],
			['.', '.', ButtonStyle.Secondary],
			['=', '=', ButtonStyle.Success],
			['+', '+', ButtonStyle.Primary]
		]
	];

	return layout.map((row) =>
		new ActionRowBuilder().addComponents(
			row.map(([label, value, style]) =>
				new ButtonBuilder().setLabel(label).setCustomId(`${idPrefix}:${value}`).setStyle(style).setDisabled(disabled)
			)
		)
	);
}

function appendValue(expression, value) {
	const previous = expression.at(-1);
	const needsSpace = expression.length > 0 && !isNumeric(value) && value !== '.' && previous !== ' ';
	const previousNeedsSpace = expression.length > 0 && !isNumeric(previous) && previous !== '.' && previous !== ' ';

	return `${expression}${needsSpace || previousNeedsSpace ? ' ' : ''}${value}`;
}

function isNumeric(value) {
	return !Number.isNaN(Number.parseInt(value, 10));
}

module.exports = {
	UserCommand
};
