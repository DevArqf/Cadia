const { Listener, LogLevel, Command } = require('@sapphire/framework');
const { cyan } = require('colorette');
const { Message, EmbedBuilder } = require('discord.js');
const { channels } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');

class UserEvent extends Listener {
	/**
	 * @param {import('@sapphire/framework').ChatInputCommandSuccessPayload} payload
	 */
	async run(payload) {
		if (isDeveloperCommand(payload.command)) return;

		const guild = payload.interaction.guild;
		const channel = payload.interaction.channel.name;
		const time = payload.interaction.createdTimestamp;
		const interaction = payload.interaction;
		const sentIn = guild ? `\`${guild.name}\` - \`${guild.id}\`` : '**Direct Messages**';

		const loggingChannel = this.container.client.channels.cache.get(channels.commandLogging);
		if (!loggingChannel) return;

		const embed = new EmbedBuilder()
			.setTimestamp(time)
			.setColor('Random')
			.setAuthor({ name: `${interaction.member.user.tag} (${interaction.member.id})`, iconURL: interaction.user.displayAvatarURL() })
			.setDescription(
				`**Command:** \`/${interaction.commandName}\`\n**Sent In:** ${sentIn}\n**Channel:** \`#${channel}\` - \`${interaction.channel.id}\``
			);

		await loggingChannel.send({ embeds: [embed] });
	}
}

module.exports = {
	UserEvent
};

function isDeveloperCommand(command) {
	return command?.permissionLevel >= PermissionLevels.Developer || /commands[\\/]Developer/.test(command?.location?.full ?? '');
}
