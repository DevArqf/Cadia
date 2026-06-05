const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { componentReply, panel } = require('../../lib/util/components');

const developers = [
	{ name: 'Malik', zone: 'America/Caracas' },
	{ name: 'Navin', zone: 'America/New_York' },
	{ name: 'Oreo', zone: 'Asia/Karachi' },
	{ name: 'Shard', zone: 'America/New_York' }
];

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: "Get the timezones of Cadia Bot's Developers (DEV ONLY)"
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => builder.setName('dev-time').setDescription(this.description));
	}

	async chatInputRun(interaction) {
		const rows = developers.map((dev) => `${emojis.custom.person} **${dev.name}:** ${formatTime(dev.zone)}\n-# ${dev.zone}`);

		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.default,
					title: `${emojis.custom.clock} **Developer Time Board**`,
					subtitle: 'Live timezone snapshot',
					sections: rows,
					footer: `${emojis.custom.person} Requested by ${interaction.user.displayName}`
				})
			)
		);
	}
}

function formatTime(timeZone) {
	return new Intl.DateTimeFormat('en-US', {
		timeZone,
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(new Date());
}

module.exports = {
	UserCommand
};
