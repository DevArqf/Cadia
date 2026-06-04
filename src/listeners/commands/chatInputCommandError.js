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
		const { context, message: content } = error;
		const { interaction, command } = payload;

		// `context: { silent: true }` should make UserError silent:
		if (Reflect.get(Object(context), 'silent')) return;

		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
		}

		const errorEmbed = new EmbedBuilder()
			.setColor(color.fail)
			.setTitle(`${emojis.reg.fail} - An error has been detected by ${interaction.client.user.displayName}`)
			.setDescription(`\`\`\`js\n${content}\n\nError is in file:\n${command.location.name}\n\nRoute: ${command.location.full}\`\`\``)
			.setTimestamp();

		await interaction.client.channels.cache.get(channels.errorLogging)?.send({ embeds: [errorEmbed] }).catch(console.error);

		const userEmbed = new EmbedBuilder()
			.setColor(`${color.fail}`)
			.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`);

		if (interaction.deferred || interaction.replied) {
			await interaction.editReply({ embeds: [userEmbed] }).catch(() => null);
			return;
		}

		await interaction.reply({ embeds: [userEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
	}
}

module.exports = UserEvent;
