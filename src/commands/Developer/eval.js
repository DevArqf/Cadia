const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { inspect } = require('node:util');
const beautify = require('beautify');
const { ButtonStyle, MessageFlags } = require('discord.js');
const { actionButton, componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Evaluates Javascript Code (DEV ONLY)'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('eval')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('code').setDescription('The code to evaluate').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const code = interaction.options.getString('code', true);
		const tokenFilter = new RegExp(
			`${interaction.client.token.split('').join('[^]{0,2}')}|${interaction.client.token.split('').reverse().join('[^]{0,2}')}`,
			'g'
		);
		const started = performance.now();

		try {
			let output = eval(code);
			if (output instanceof Promise || (Boolean(output) && typeof output.then === 'function' && typeof output.catch === 'function')) {
				output = await output;
			}

			const elapsed = Math.max(performance.now() - started, 0).toFixed(2);
			const evaluatedCode = truncate(beautify(code, { format: 'js' }), 900);
			const inspectedOutput = truncate(inspect(output).replace(tokenFilter, '[redacted]').replaceAll("'", ''), 1400);

			const response = await interaction.reply({
				...componentReply(
					panel({
						accentColor: color.default,
						title: `${emojis.custom.javascript} **Evaluation Complete**`,
						subtitle: 'Owner runtime console',
						sections: [
							`${emojis.custom.pencil} **Input**\n\`\`\`js\n${evaluatedCode}\n\`\`\``,
							`${emojis.custom.openfolder} **Output**\n\`\`\`js\n${inspectedOutput}\n\`\`\``,
							`${emojis.custom.clock} Operation completed in **${elapsed}ms**.`
						],
						buttons: [actionButton(`eval-delete:${interaction.id}`, 'Delete Output', ButtonStyle.Danger, emojis.custom.trash)]
					})
				),
				withResponse: true
			});

			const message = response.resource?.message ?? (await interaction.fetchReply());
			const collector = message.createMessageComponentCollector({ time: 120_000 });
			collector.on('collect', async (i) => {
				if (i.user.id !== interaction.user.id) {
					return i.reply(
						componentReply(
							notice(`${emojis.custom.forbidden} **Not Your Output**`, 'Only the command runner can delete this evaluation.'),
							true
						)
					);
				}
				if (i.customId === `eval-delete:${interaction.id}`) await i.message.delete().catch(() => null);
			});
		} catch (error) {
			console.error(error);
			return interaction.reply({
				...componentReply(
					notice(
						`${emojis.custom.fail} **Evaluation Failed**`,
						`\`\`\`js\n${truncate(String(error.stack || error.message || error), 1600)}\n\`\`\``
					),
					true
				),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}
	}
}

function truncate(value, max) {
	return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

module.exports = {
	UserCommand
};
