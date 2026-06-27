const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { color, emojis } = require('../../../config');
const { CountActivity, CountingReward } = require('../../../lib/schemas/countSchema');
const { GuildSchema } = require('../../../lib/schemas/guildSchema');
const { invalidateCountingConfig } = require('../../../listeners/messages/counting/counting');

class CountingCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Set up and view the counting game for your server'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('setup')
						.setDescription('Set up the counting game for your server')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel to use for counting')
								.setRequired(true)
								.addChannelTypes(ChannelType.GuildText)
						)
						.addIntegerOption((option) =>
							option.setName('goal').setDescription('The counting goal').setMinValue(1).setMaxValue(100_000).setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('reward')
						.setDescription('Set a one-time reward for a counting milestone')
						.addIntegerOption((option) =>
							option.setName('count').setDescription('The reward milestone').setMinValue(1).setMaxValue(100_000).setRequired(true)
						)
						.addIntegerOption((option) => option.setName('amount').setDescription('Coins awarded at the milestone').setMinValue(1))
				)
				.addSubcommandGroup((group) =>
					group
						.setName('leaderboard')
						.setDescription('View counting leaderboards')
						.addSubcommand((subcommand) => subcommand.setName('global').setDescription('View the global server leaderboard'))
						.addSubcommand((subcommand) => subcommand.setName('local').setDescription('View this server member leaderboard'))
				)
		);
	}

	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();
		if (['setup', 'reward'].includes(subcommand) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return interaction.reply({
				content: `${emojis.custom.forbidden} You need the Manage Server permission to configure counting.`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (subcommand === 'setup') return this.setup(interaction);
		if (subcommand === 'reward') return this.reward(interaction);
		if (subcommand === 'global') return this.globalLeaderboard(interaction);
		if (subcommand === 'local') return this.localLeaderboard(interaction);
	}

	async setup(interaction) {
		const channel = interaction.options.getChannel('channel', true);
		const goal = interaction.options.getInteger('goal', true);
		if (!channel.isTextBased()) return interaction.reply(privateError('The channel must be text-based.'));

		await GuildSchema.findOneAndUpdate(
			{ id: interaction.guildId },
			{
				$set: {
					countChannel: channel.id,
					countGoal: goal,
					countLastUser: null,
					countLastScore: 0
				}
			},
			{ upsert: true }
		);
		invalidateCountingConfig(interaction.guildId);
		return interaction.reply({
			content: `${emojis.custom.success} Counting is ready in ${channel} with a goal of **${goal}**.`,
			flags: MessageFlags.Ephemeral
		});
	}

	async reward(interaction) {
		const config = await GuildSchema.findOne({ id: interaction.guildId });
		const channel = config?.countChannel ? interaction.guild.channels.cache.get(config.countChannel) : null;
		if (!channel?.isTextBased()) return interaction.reply(privateError('Set up the counting game before adding rewards.'));

		const milestone = interaction.options.getInteger('count', true);
		const amount = interaction.options.getInteger('amount') ?? 1_000;
		await CountingReward.findOneAndUpdate({ guildId: interaction.guildId, milestone }, { $set: { reward: amount } }, { upsert: true });
		await channel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle('Counting Game Reward')
					.setDescription(`${emojis.custom.success} Reach **${milestone}** to earn **${amount}** coins.`)
					.setColor(color.success)
			]
		});
		return interaction.reply({
			content: `${emojis.custom.success} The **${amount}** coin reward is set for count **${milestone}**.`,
			flags: MessageFlags.Ephemeral
		});
	}

	async globalLeaderboard(interaction) {
		const guilds = await GuildSchema.find({ count: { $ne: 0 } })
			.sort({ count: -1 })
			.limit(10);
		if (!guilds.length) return interaction.reply(privateError('No server has counted yet.'));

		const leaderboard = guilds
			.map((guild, index) => {
				const name = this.container.client.guilds.cache.get(guild.id)?.name || 'Unknown Server';
				return `${index + 1}. ${name} — ${guild.count}`;
			})
			.join('\n');
		return interaction.reply({
			embeds: [new EmbedBuilder().setTitle('Global Counting Leaderboard').setDescription(leaderboard).setColor(color.success)]
		});
	}

	async localLeaderboard(interaction) {
		const config = await GuildSchema.findOne({ id: interaction.guildId });
		if (!config?.countChannel) return interaction.reply(privateError('The counting game has not been set up.'));

		const leaders = await CountActivity.find({ guildId: interaction.guildId }).sort({ count: -1 }).limit(10);
		if (!leaders.length) return interaction.reply(privateError('No member has counted yet.'));

		const leaderboard = leaders
			.map((entry, index) => {
				const member = interaction.guild.members.cache.get(entry.userId);
				return `${index + 1}. ${member?.user.username || 'Unknown User'} — ${entry.count}`;
			})
			.join('\n');
		return interaction.reply({
			embeds: [new EmbedBuilder().setTitle('Server Counting Leaderboard').setDescription(leaderboard).setColor(color.success)]
		});
	}
}

function privateError(message) {
	return {
		content: `${emojis.custom.fail} ${message}`,
		flags: MessageFlags.Ephemeral
	};
}

module.exports = {
	UserCommand: CountingCommand,
	countingCommand: CountingCommand
};
