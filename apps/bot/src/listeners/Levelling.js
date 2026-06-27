const { Listener } = require('@sapphire/framework');
const { EmbedBuilder } = require('discord.js');
const { color, emojis } = require('../config');
const Level = require('../lib/schemas/levelSchema');
const LevelConfig = require('../lib/schemas/levelConfigSchema');
const { MESSAGE_XP_COOLDOWN_MS, XP_PER_LEVEL, CooldownTracker, calculateMessageXp } = require('../lib/util/leveling');
const { getGuildCommandConfig, isModuleEnabled } = require('../lib/runtime/guildCommandConfig');

const CONFIG_CACHE_MS = 60_000;
const configCache = new Map();
const xpCooldowns = new CooldownTracker(MESSAGE_XP_COOLDOWN_MS);

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
			const [config, commandConfig] = await Promise.all([getLevelConfig(guildId), getGuildCommandConfig(guildId)]);

			if (!config?.enabled || !isModuleEnabled(commandConfig, 'levelling')) return;
			const cooldownKey = `${guildId}:${userId}`;
			if (!xpCooldowns.tryAcquire(cooldownKey)) return;

			try {
				let level = await Level.findOne({ guildId, userId });
				if (!level) level = await Level.create({ guildId, userId });

				const earnedXp = calculateMessageXp(message);
				level.userXp += earnedXp;
				level.totalXp += earnedXp;

				if (level.userXp >= XP_PER_LEVEL) {
					level.userXp -= XP_PER_LEVEL;
					level.userLevel += 1;

					await sendLevelUpMessage(message, config, level);
				}

				await level.save();
			} catch (error) {
				xpCooldowns.release(cooldownKey);
				throw error;
			}
		} catch (error) {
			if (['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EPIPE'].includes(error?.code)) return;
			throw error;
		}
	}
}

async function getLevelConfig(guildId) {
	const cached = configCache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.config;
	const config = await LevelConfig.findOne({ guildId });
	configCache.set(guildId, { config, expiresAt: Date.now() + CONFIG_CACHE_MS });
	return config;
}

function updateLevelConfigCache(guildId, config) {
	configCache.set(guildId, { config, expiresAt: Date.now() + CONFIG_CACHE_MS });
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
	UserEvent,
	getLevelConfig,
	updateLevelConfigCache
};
