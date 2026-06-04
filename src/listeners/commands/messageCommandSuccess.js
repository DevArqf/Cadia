const { Listener, LogLevel, Command } = require('@sapphire/framework');
const { cyan } = require('colorette');
const { Message, EmbedBuilder } = require('discord.js');
const { channels } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');

class UserEvent extends Listener {
	/**
	 *
	 * @param {{message: Message, command: Command}} param0
	 */
	async run({ message, command }) {
		if (isDeveloperCommand(command)) return;

		const shard = this.shard(message.guild?.shardId ?? 0);
		const commandName = this.command(command);
		const author = this.author(message.author);
		const sentAt = message.guild ? this.guild(message.guild) : this.direct();
		this.container.logger.debug(`${shard} - ${commandName} ${author} ${sentAt}`);

		const sentIn = message.guild ? `**${message.guild.name}** - \`${message.guild.id}\`` : '**Direct Messages**';
		const channel = message.channel.name;
		const time = message.createdTimestamp;

		const loggingChannel = this.container.client.channels.cache.get(channels.commandLogging);
		if (!loggingChannel) return;

		const embed = new EmbedBuilder()
			.setTimestamp(time)
			.setColor('Random')
			.setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL() })
			.setDescription(`**Command:** ${commandName}\n**Sent In:** ${sentIn}\n**Channel:** ${channel}`);

		await loggingChannel.send({ embeds: [embed] });
	}

	onLoad() {
		this.enabled = this.container.logger.level <= LogLevel.Debug;
		return super.onLoad();
	}

	shard(id) {
		return `[${cyan(id.toString())}]`;
	}

	command(command) {
		return cyan(command.name);
	}

	author(author) {
		return `${author.username}[${cyan(author.id)}]`;
	}

	direct() {
		return cyan('Direct Messages');
	}

	guild(guild) {
		return `${guild.name}[${cyan(guild.id)}]`;
	}
}

module.exports = {
	UserEvent
};

function isDeveloperCommand(command) {
	return command?.permissionLevel >= PermissionLevels.Developer || /commands[\\/]Developer/.test(command?.location?.full ?? '');
}
