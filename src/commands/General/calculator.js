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
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../lib/runtime/interactionSessions');

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
		await saveInteractionSession({
			kind: 'calculator',
			sessionId: interaction.id,
			ownerId: interaction.user.id,
			guildId: interaction.guildId || interaction.guild?.id || null,
			channelId: interaction.channelId || interaction.channel?.id || null,
			messageId: message?.id || null,
			state: { expression, note },
			ttlMs: 600_000
		});
	}
}

async function handleCalculatorInteraction(interaction) {
	if (!interaction.isButton?.() || !interaction.customId?.startsWith('calculator:')) return false;
	const [, sessionId] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;
	if (interaction.user.id !== ownerId) {
		return interaction.reply({
			content: `${emojis.custom.forbidden} This calculator belongs to <@${ownerId}>. Run /calculator to open your own.`,
			flags: MessageFlags.Ephemeral
		});
	}

	const idPrefix = `calculator:${session?.sessionId || sessionId}`;
	const value = interaction.customId.slice(`${idPrefix}:`.length);
	let expression = session?.state?.expression || '';
	let note = '';

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

	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'calculator',
		ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state: { expression, note },
		ttlMs: 600_000
	});

	await interaction.update({
		components: [buildCalculatorContainer(expression, note, buildKeypad(idPrefix))],
		flags: MessageFlags.IsComponentsV2
	});
	return true;
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
	UserCommand,
	buildCalculatorContainer,
	handleCalculatorInteraction
};
