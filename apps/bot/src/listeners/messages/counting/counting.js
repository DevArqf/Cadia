const { Events, Listener } = require('@sapphire/framework');
const { GuildSchema } = require('../../../lib/schemas/guildSchema');
const { CountActivity } = require('../../../lib/schemas/countSchema');
const { getGuildCommandConfig, isModuleEnabled } = require('../../../lib/runtime/guildCommandConfig');
const CONFIG_CACHE_MS = 15_000;
const guildConfigCache = new Map();

class UserEvent extends Listener {
	constructor(context, options) {
		super(context, {
			...options,
			event: Events.PreMessageParsed,
			name: 'counting'
		});
	}

	async run(message) {
		const guild = message.guild;
		if (!guild) return;

		const [data, commandConfig] = await Promise.all([getCountingConfig(guild.id), getGuildCommandConfig(guild.id)]);
		if (!data?.countChannel || !isModuleEnabled(commandConfig, 'counting')) return;

		const channel = guild.channels.cache.get(data.countChannel);
		if (!channel?.isTextBased() || channel.id !== message.channel.id) return;

		const currentNumber = Number(message.content);
		if (!Number.isInteger(currentNumber)) {
			if (message.deletable) await message.delete();
			return;
		}

		const lastNumber = data.count || 0;
		if (currentNumber !== lastNumber + 1) {
			await channel.send({ content: `${message.author} ruined the count at **${lastNumber}**!` });
			await GuildSchema.updateOne(
				{ id: guild.id },
				{
					$set: {
						count: 0,
						countLastUser: null,
						countLastScore: lastNumber
					}
				}
			);
			data.count = 0;
			data.countLastUser = null;
			data.countLastScore = lastNumber;
			await channel.send({ content: 'The count has been reset to **0**' });
			return;
		}

		if (message.reactable) await message.react('✅');
		this.container.client.emit('successfulCount', message, currentNumber);

		await Promise.all([
			GuildSchema.updateOne(
				{ id: guild.id },
				{
					$set: {
						count: currentNumber,
						countLastUser: message.author.id,
						countHighscore: Math.max(currentNumber, data.countHighscore || 0)
					}
				}
			),
			CountActivity.findOneAndUpdate({ userId: message.author.id, guildId: guild.id }, { $inc: { count: 1 } }, { upsert: true })
		]);
		data.count = currentNumber;
		data.countLastUser = message.author.id;
		data.countHighscore = Math.max(currentNumber, data.countHighscore || 0);

		if (data.countGoal === currentNumber) {
			await message.reply({ content: `Congratulations! You reached the goal of **${currentNumber}**!` });
			if (message.pinnable) await message.pin();
		}
	}
}

async function getCountingConfig(guildId) {
	const cached = guildConfigCache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.config;
	const config = await GuildSchema.findOne({ id: guildId });
	guildConfigCache.set(guildId, { config, expiresAt: Date.now() + CONFIG_CACHE_MS });
	return config;
}

function invalidateCountingConfig(guildId) {
	guildConfigCache.delete(guildId);
}

module.exports = { UserEvent, getCountingConfig, invalidateCountingConfig };
