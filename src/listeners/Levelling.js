const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');
const { color, emojis } = require('../config');
const Level = require('../lib/schemas/levelSchema');
const LevelConfig = require('../lib/schemas/levelConfigSchema');

const XP_PER_MESSAGE = 1;
const XP_PER_LEVEL = 100;

class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			event: 'messageCreate',
			once: false
		});
	}

	async run(message) {
		if (!message.guild || message.author.bot) return;

		try {
			const guildId = message.guild.id;
			const userId = message.author.id;
			const config = await LevelConfig.findOne({ guildId });

			if (!config?.enabled) return;

			let level = await Level.findOne({ guildId, userId });
			if (!level) level = await Level.create({ guildId, userId });

			level.userXp += XP_PER_MESSAGE;
			level.totalXp += XP_PER_MESSAGE;

			if (level.userXp >= XP_PER_LEVEL) {
				level.userXp -= XP_PER_LEVEL;
				level.userLevel += 1;

				await sendLevelUpMessage(message, config, level);
			}

			await level.save();
		} catch (error) {
			if (['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EPIPE'].includes(error?.code)) return;
			throw error;
		}
	}
}

async function sendLevelUpMessage(message, config, level) {
	const channel = message.guild.channels.cache.get(config.channelId) ?? message.channel;
	const levelUpMessage = getLevelUpMessage(message, config, level);

	if (config.useEmbed) {
		const embed = new EmbedBuilder()
			.setColor(color.default)
			.setTitle(`${emojis.custom.tada2} Level Up`)
			.setDescription(levelUpMessage)
			.setThumbnail(message.author.displayAvatarURL())
			.setTimestamp();

		await channel.send({ embeds: [embed] });
		return;
	}

	await channel.send(levelUpMessage);
}

function getLevelUpMessage(message, config, level) {
	const template = config.messages?.[0]?.content;
	const fallback = `${emojis.custom.tada2} **Congratulations** ${message.author}! You have **leveled up** to level **${level.userLevel}**!`;

	return (template || fallback)
		.replaceAll('{userName}', message.author.username)
		.replaceAll('{userMention}', `<@${message.author.id}>`)
		.replaceAll('{userLevel}', level.userLevel.toString())
		.replaceAll('{userXp}', level.userXp.toString());
}

module.exports = {
	UserEvent
};
