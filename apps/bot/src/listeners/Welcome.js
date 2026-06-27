const { Listener } = require('@sapphire/framework');
const { WelcomeSchema } = require('../lib/schemas/welcomeSchema');
const { normalizeWelcomeConfig, renderWelcomeMessage } = require('../lib/util/welcomeTemplates');
const { getGuildCommandConfig, isModuleEnabled } = require('../lib/runtime/guildCommandConfig');

class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			event: 'guildMemberAdd',
			once: false
		});
	}

	async run(member) {
		const [find, commandConfig] = await Promise.all([
			WelcomeSchema.findOne({ guildId: member.guild.id }),
			getGuildCommandConfig(member.guild.id)
		]);
		if (!find || find.enabled === false || !isModuleEnabled(commandConfig, 'welcome')) return;

		const config = normalizeWelcomeConfig(find);
		const channel =
			member.guild.channels.cache.get(config.welcomeChannelId) ||
			(await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null));
		if (!channel?.isTextBased?.()) return;

		return channel.send(renderWelcomeMessage(member, config)).catch(() => null);
	}
}

module.exports = {
	UserEvent
};
