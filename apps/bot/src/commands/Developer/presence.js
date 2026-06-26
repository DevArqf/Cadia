const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { ActivityType } = require('discord.js');
const { componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: "Modify the Bot's Presence"
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('presence')
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('The status type')
						.addChoices(
							{ name: 'Idle', value: 'Idle' },
							{ name: 'Online', value: 'Online' },
							{ name: 'Do Not Disturb', value: 'Do not disturb' },
							{ name: 'Invisible', value: 'Invisible' }
						)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('activity')
						.setDescription('The activity type')
						.addChoices(
							{ name: 'Playing', value: 'Playing' },
							{ name: 'Listening', value: 'Listening' },
							{ name: 'Watching', value: 'Watching' },
							{ name: 'Streaming', value: 'Streaming' }
						)
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName('name')
						.setDescription('The activity text. Variables: {users}, {guilds}, {commands}')
						.setMaxLength(128)
						.setRequired(false)
				)
				.addStringOption((option) =>
					option.setName('url').setDescription('The stream URL. Required when activity is Streaming.').setRequired(false)
				)
		);
	}

	async chatInputRun(interaction) {
		try {
			const presence = interaction.options.getString('type', true);
			const activity = interaction.options.getString('activity');
			const name = interaction.options.getString('name');
			const url = interaction.options.getString('url');
			const activityData = getActivityData(interaction.client, activity, name, url);

			interaction.client.disableActivityRotation = true;
			interaction.client.user.setPresence({
				status: getStatus(presence),
				activities: activityData ? [activityData] : []
			});

			return interaction.reply(
				componentReply(
					panel({
						accentColor: color.default,
						title: `${emojis.custom.connected} **Presence Updated**`,
						subtitle: 'Activity rotation is now paused',
						sections: [
							`${emojis.custom.online} **Status:** ${presence}`,
							`${emojis.custom.settings} **Activity:** ${activityData ? `${activity} ${activityData.name}` : 'None'}`,
							activityData?.url ? `${emojis.custom.link} **Stream URL:** ${activityData.url}` : null
						].filter(Boolean),
						footer: `${emojis.custom.person} Updated by ${interaction.user.displayName}`
					})
				)
			);
		} catch (error) {
			console.error(error);
			const message =
				error.message === 'Streaming requires a valid Twitch or YouTube URL.'
					? 'Streaming presence requires a valid Twitch or YouTube URL.'
					: 'The presence update could not be applied.';
			return interaction.reply(componentReply(notice(`${emojis.custom.fail} **Presence Update Failed**`, message), true));
		}
	}
}

function getStatus(presence) {
	if (presence === 'Online') return 'online';
	if (presence === 'Idle') return 'idle';
	if (presence === 'Do not disturb') return 'dnd';
	if (presence === 'Invisible') return 'invisible';
	return 'online';
}

function getActivityData(client, activity, name, url) {
	if (!activity) return null;

	const activityName = resolveActivityName(client, name || 'Cadia');

	if (activity === 'Streaming') {
		if (!url || !/^https:\/\/(www\.)?(twitch\.tv|youtube\.com|youtu\.be)\//i.test(url)) {
			throw new Error('Streaming requires a valid Twitch or YouTube URL.');
		}

		return {
			type: ActivityType.Streaming,
			name: activityName,
			url
		};
	}

	const activityTypes = {
		Playing: ActivityType.Playing,
		Listening: ActivityType.Listening,
		Watching: ActivityType.Watching
	};

	return {
		type: activityTypes[activity],
		name: activityName
	};
}

function resolveActivityName(client, name) {
	const totalUsers = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount ?? 0), 0);
	const totalGuilds = client.guilds.cache.size;
	const totalCommands = client.stores.get('commands')?.size ?? 0;

	return name
		.replace(/\{users\}/gi, totalUsers.toLocaleString())
		.replace(/\{guilds\}/gi, totalGuilds.toLocaleString())
		.replace(/\{commands\}/gi, totalCommands.toLocaleString());
}

module.exports = {
	UserCommand
};
