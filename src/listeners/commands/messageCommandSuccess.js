const { Listener, LogLevel, Command } = require('@sapphire/framework');
const { cyan } = require('colorette');
const { Message, EmbedBuilder } = require('discord.js');
const { channels } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');
const { recordCommandRun } = require('../../lib/util/botAnalytics');
const { commandCategory, isMeaningfulCommand, normalizeCommandPath } = require('../../lib/analytics/growth');

class UserEvent extends Listener {
	/**
	 *
	 * @param {{message: Message, command: Command}} param0
	 */
	run(payload) {
		void handleMessageCommandSuccess(this, payload).catch((error) =>
			this.container.logger.warn(`Message command post-processing failed: ${error.message}`)
		);
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

async function handleMessageCommandSuccess(listener, { message, command }) {
	const commandPath = normalizeCommandPath(command?.name);
	const category = commandCategory(command, commandPath);
	const developerCommand = isDeveloperCommand(command);
	await recordCommandRun({
		client: listener.container.client,
		user: message.author,
		guild: message.guild,
		commandName: commandPath,
		commandCategory: category,
		meaningful: isMeaningfulCommand({ commandPath, category, isDeveloper: developerCommand }),
		type: 'message'
	});

	if (developerCommand) return;

	const shard = listener.shard(message.guild?.shardId ?? 0);
	const commandName = listener.command(command);
	const author = listener.author(message.author);
	const sentAt = message.guild ? listener.guild(message.guild) : listener.direct();
	listener.container.logger.debug(`${shard} - ${commandName} ${author} ${sentAt}`);

	const sentIn = message.guild ? `**${message.guild.name}** - \`${message.guild.id}\`` : '**Direct Messages**';
	const channel = message.channel.name;
	const time = message.createdTimestamp;

	const loggingChannel = listener.container.client.channels.cache.get(channels.commandLogging);
	if (!loggingChannel) return;

	const embed = new EmbedBuilder()
		.setTimestamp(time)
		.setColor('Random')
		.setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL() })
		.setDescription(`**Command:** ${commandName}\n**Sent In:** ${sentIn}\n**Channel:** ${channel}`);

	await loggingChannel.send({ embeds: [embed] });
}

module.exports = {
	UserEvent
};

function isDeveloperCommand(command) {
	return command?.permissionLevel >= PermissionLevels.Developer || /commands[\\/]Developer/.test(command?.location?.full ?? '');
}
