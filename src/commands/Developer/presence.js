const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { ActivityType, EmbedBuilder, MessageFlags } = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: "Modify the Bot's Presence"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
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
					option
						.setName('url')
						.setDescription('The stream URL. Required when activity is Streaming.')
						.setRequired(false)
				)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
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

			const embed = new EmbedBuilder()
				.setTitle("Cadia's Presence")
				.setDescription(
					`${emojis.custom.success} **Successfully** set presence to **${presence}**${activityData ? ` with **${activity} ${activityData.name}**` : ''}!`
				)
				.setColor(color.default)
				.setTimestamp()
				.setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });

			return interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);

			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(error.message === 'Streaming requires a valid Twitch or YouTube URL.'
					? `${emojis.custom.fail} Streaming presence requires a valid Twitch or YouTube URL.`
					: `${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
				.setTimestamp();

			await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
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
