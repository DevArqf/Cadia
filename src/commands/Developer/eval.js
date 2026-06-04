const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { inspect } = require('util');
const beautify = require('beautify');
const { EmbedBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.BotOwner,
			description: 'Evaluates Javascript Code (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('eval')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('code').setDescription('The code to evaluate').setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		// Get the code from the interaction options
		const code = interaction.options.getString('code');

		// Create a regular expression to filter out the bot token from the code
		const tokenfilter = new RegExp(
			`${interaction.client.token.split('').join('[^]{0,2}')}|${interaction.client.token.split('').reverse().join('[^]{0,2}')}`,
			'g'
		);

		try {
			// Evaluate the code
			let output = eval(code);
			// If the output is a promise, wait for it to resolve
			if (output instanceof Promise || (Boolean(output) && typeof output.then === 'function' && typeof output.catch === 'function'))
				output = await output;
			// Inspect the output
			output = inspect(output);
			// Replace the bot token with "no" in the output
			output = output.replace(tokenfilter, 'no');

			// Measure the time taken to execute the code
			let start, end;
			start = new Date();
			for (let i = 0; i < 1000; i++) {
				Math.sqrt(i);
			}
			end = new Date();

			// Beautify the evaluated code for display
			const evaluatedCode = beautify(code, { format: 'js' });

			// Create an embed to display the evaluated code and output
			const embed = new EmbedBuilder()
				.setColor(color.default)
				.setTitle('`🔍` Evaluated Code')
				.setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
				.setDescription(
					`**Input:**\n\`\`\`js\n${evaluatedCode}\n\`\`\`\n**Output:**\n\`\`\`${output.replaceAll("'", '')}\`\`\`\n**Operation took** \`${end?.getTime() - start?.getTime()}\` **millisecond**${end?.getTime() - start?.getTime() > 1 ? 's' : ''}.`
				)
				.setTimestamp();

			// Check if embed size is within limits for Discord
			if (embed.length < 1800) {
				// If within limits, reply with embed
				interaction.reply({ embeds: [embed] });
			} else {
				// If exceeds limits, reply without embed
				interaction.reply({
					content: `**Operation took** \`${end?.getTime() - start?.getTime()}\` **millisecond**${end?.getTime() - start?.getTime() > 1 ? 's' : ''}.`
				});
			}

			// Create a collector for message components (buttons)
			const filter = (i) => {
				if (i.user.id === interaction.author.id) return true;
				i.reply({ content: `${emojis.custom.forbidden} You are not **authorized** to **execute** this command!**`, flags: MessageFlags.Ephemeral });
				return false;
			};

			const collector = await interaction.channel.createMessageComponentCollector({
				filter,
				componentType: 'BUTTON'
			});

			// Handle button click events
			collector.on('collect', async (i) => {
				i.deferUpdate();
				if (i.customId === 'delete-evaluated-output') {
					i.message.delete();
				}
			});
		} catch (error) {
			// If an error occurs, send the error message to the channel
			console.error(error);
			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
				.setTimestamp();

			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
			return;
		}
	}
}

module.exports = {
	UserCommand
};
