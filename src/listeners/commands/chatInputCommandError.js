const { Listener, UserError, ChatInputCommandErrorPayload } = require('@sapphire/framework');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { emojis, channels, color } = require('../../config');

class UserEvent extends Listener {
	/**
	 * Handles the user event.
	 * @param {UserError} error - The error object.
	 * @param {ChatInputCommandErrorPayload} payload - The payload object.
	 * @returns {Promise<void>} - A promise that resolves when the event is handled.
	 */
	async run(error, payload) {
		const { context } = error;
		const { interaction, command, duration } = payload;

		// `context: { silent: true }` should make UserError silent.
		if (Reflect.get(Object(context), 'silent')) return;

		await sendDeveloperErrorLog(error, payload);
		await sendUserErrorReply(interaction);
	}
}

async function sendDeveloperErrorLog(error, payload) {
	const { interaction, command, duration } = payload;
	const loggingChannel = interaction.client.channels.cache.get(channels.errorLogging);
	if (!loggingChannel) return;

	const guild = interaction.guild;
	const channel = interaction.channel;
	const errorCode = error.code ?? error.rawError?.code ?? 'N/A';
	const httpStatus = error.status ?? 'N/A';
	const requestMethod = error.method ?? 'N/A';
	const requestUrl = error.url ?? 'N/A';
	const stack = formatStack(error);

	const embed = new EmbedBuilder()
		.setColor(color.fail)
		.setTitle(`${emojis.reg.fail} Command Error`)
		.setDescription(codeBlock(error.message || 'No error message was provided.', 900))
		.addFields(
			{
				name: `${emojis.custom.slash} Command`,
				value: [
					`Name: \`/${interaction.commandName}\``,
					`Handler: \`${command?.name ?? 'Unknown'}\``,
					`File: \`${command?.location?.name ?? 'Unknown'}\``,
					`Route: \`${shorten(command?.location?.full ?? 'Unknown', 900)}\``
				].join('\n')
			},
			{
				name: `${emojis.custom.person} User`,
				value: [`Tag: \`${interaction.user.tag}\``, `ID: \`${interaction.user.id}\``].join('\n'),
				inline: true
			},
			{
				name: `${emojis.custom.community} Server`,
				value: guild ? [`Name: \`${shorten(guild.name, 80)}\``, `ID: \`${guild.id}\``].join('\n') : '`Direct Messages`',
				inline: true
			},
			{
				name: `${emojis.custom.comment} Channel`,
				value: channel
					? [`Name: ${channel.name ? `\`#${shorten(channel.name, 80)}\`` : '`Unknown`'}`, `ID: \`${channel.id}\``].join('\n')
					: '`Unknown`',
				inline: true
			},
			{
				name: `${emojis.custom.warning} Error Details`,
				value: [
					`Type: \`${error.name ?? 'Error'}\``,
					`Identifier: \`${error.identifier ?? 'N/A'}\``,
					`Code: \`${errorCode}\``,
					`HTTP Status: \`${httpStatus}\``,
					`Duration: \`${typeof duration === 'number' ? `${duration}ms` : 'N/A'}\``
				].join('\n')
			}
		)
		.setTimestamp();

	if (requestMethod !== 'N/A' || requestUrl !== 'N/A') {
		embed.addFields({
			name: `${emojis.custom.link} Discord Request`,
			value: [`Method: \`${requestMethod}\``, `URL: \`${shorten(requestUrl, 900)}\``].join('\n')
		});
	}

	if (stack) {
		embed.addFields({
			name: `${emojis.custom.pencil} Stack Preview`,
			value: codeBlock(stack, 1000)
		});
	}

	await loggingChannel.send({ embeds: [embed] }).catch(console.error);
}

async function sendUserErrorReply(interaction) {
	const userEmbed = new EmbedBuilder()
		.setColor(color.fail)
		.setDescription(
			`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/26R7kXa6dx) for assistance or use </bugreport:1511812665398264024>*`
		);

	if (interaction.deferred || interaction.replied) {
		await interaction.editReply({ embeds: [userEmbed] }).catch(() => null);
		return;
	}

	await interaction.reply({ embeds: [userEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
}

function formatStack(error) {
	if (!error.stack) return null;

	return error.stack
		.split('\n')
		.slice(0, 8)
		.map((line) => line.trim())
		.join('\n');
}

function codeBlock(content, maxLength) {
	return `\`\`\`js\n${shorten(String(content), maxLength)}\n\`\`\``;
}

function shorten(content, maxLength) {
	if (content.length <= maxLength) return content;
	return `${content.slice(0, maxLength - 3)}...`;
}

module.exports = UserEvent;
