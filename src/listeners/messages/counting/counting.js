const { Events, Listener } = require('@sapphire/framework');
const { GuildSchema } = require('../../../lib/schemas/guildSchema');
const { CountActivity } = require('../../../lib/schemas/countSchema');

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

		const data = await GuildSchema.findOne({ id: guild.id });
		if (!data?.countChannel) return;

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

		if (data.countGoal === currentNumber) {
			await message.reply({ content: `Congratulations! You reached the goal of **${currentNumber}**!` });
			if (message.pinnable) await message.pin();
		}
	}
}

module.exports = { UserEvent };
