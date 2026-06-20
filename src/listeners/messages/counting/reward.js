const { Listener } = require('@sapphire/framework');
const { CountingReward } = require('../../../lib/schemas/countSchema');
const { UserSchema } = require('../../../lib/schemas/userSchema');

class UserEvent extends Listener {
	constructor(context, options) {
		super(context, {
			...options,
			event: 'successfulCount',
			name: 'rewardCounting'
		});
	}

	async run(message, count) {
		const reward = await CountingReward.findOne({
			milestone: count,
			guildId: message.guild.id
		});
		if (!reward) return;

		const member = await message.guild.members.fetch(message.author.id);
		if (!member) return;

		await UserSchema.updateOne({ id: member.id }, { $inc: { balance: reward.reward } });
		await message.channel.send({
			content: `${message.author} has been **rewarded** with **${reward.reward}** for reaching **${count}**!`
		});
		await CountingReward.deleteMany({
			milestone: count,
			guildId: message.guild.id
		});
	}
}

module.exports = { UserEvent };
