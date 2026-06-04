const { Command, ApplicationCommandRegistry } = require('@sapphire/framework');
const { ChatInputCommandInteraction, EmbedBuilder, ChannelType , MessageFlags} = require('discord.js');
const { emojis, color } = require('../../../config');
const { GuildSchema } = require('../../../lib/schemas/guildSchema');
const { CountActivity, CountingReward } = require('../../../lib/schemas/countSchema');

class countingCommand extends Command {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Setup the counting game for your server'
		});
	}

	/**
	 *
	 * @param {ApplicationCommandRegistry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				// Setup Subcommand
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('setup')
						.setDescription('Setup the counting game for your server')
						.addChannelOption((option) =>
							option //
								.setName('channel')
								.setDescription('The channel to setup the counting game in')
								.setRequired(true)
								.addChannelTypes(ChannelType.GuildText)
						)
						.addIntegerOption((option) =>
							option //
								.setName('goal')
								.setDescription('The goal for the counting game')
								.setMaxValue(100_000)
								.setMinValue(1)
								.setRequired(true)
						)
				)
				// Add reward subcommand
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('reward')
						.setDescription('Setup a reward for the counting game')
						.addIntegerOption((option) =>
							option //
								.setName('count')
								.setDescription('The count the user must reach to get the reward')
								.setMaxValue(100_000)
								.setRequired(true)
								.setMinValue(1)
						)
						.addIntegerOption((option) =>
							option //
								.setName('amount')
								.setDescription('The amount of coins to give the user')
								.setMinValue(1)
						)
				)
				// View leaderboard subcommand
				.addSubcommandGroup((sg) =>
					sg //
						.setName('leaderboard')
						.setDescription('View the leaderboard for the counting game')
						.addSubcommand((subcommand) =>
							subcommand //
								.setName('global')
								.setDescription('View the global leaderboard for the counting game')
						)
						.addSubcommand((subcommand) =>
							subcommand //
								.setName('local')
								.setDescription('View the local leaderboard for the counting game')
						)
				)
		);
	}

	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'setup') {
			const channel = interaction.options.getChannel('channel', true);
			const goal = interaction.options.getInteger('goal', true);

			if (!channel.isTextBased()) {
				await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} The **channel** must be a **text** channel`)], flags: MessageFlags.Ephemeral });
				return;
			}

			await GuildSchema.findOneAndUpdate(
				{
					id: interaction.guildId
				},
				{
					countChannel: channel.id,
					countGoal: goal,
					countLastUser: null,
					countLastScore: 0
				},
				{
					upsert: true
				}
			);

			// await this.container.db.guild.upsert({
			// 	where: {
			// 		id: interaction.guildId
			// 	},
			// 	update: {
			// 		countChannel: channel.id,
			// 		countGoal: goal,
			// 		countLastUser: null,
			// 		countLastScore: 0
			// 	},
			// 	create: {
			// 		id: interaction.guildId,
			// 		countChannel: channel.id,
			// 		countGoal: goal,
			// 		countLastUser: null,
			// 		countLastScore: 0
			// 	}
			// });

			await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.success} The counting game has been **setup** in ${channel}`)], flags: MessageFlags.Ephemeral });
		}

		if (subcommand === 'reward') {
			const count = interaction.options.getInteger('count', true);
			let amount = interaction.options.getInteger('amount') ?? 1000;

			await CountingReward.findOneAndUpdate(
				{
					guildId: interaction.guildId,
					milestone: count
				},
				{
					reward: amount
				},
				{
					upsert: true
				}
			);

			// await this.container.db.countingReward.upsert({
			// 	where: {
			// 		guildId: interaction.guildId,
			// 		count: count
			// 	},
			// 	update: {
			// 		amount
			// 	},
			// 	create: {
			// 		guildId: interaction.guildId,
			// 		count,
			// 		amount
			// 	}
			// });

			const data = await GuildSchema.findOne({
				id: interaction.guildId
			});

			// const data = await this.container.db.guild.findFirst({
			// 	where: {
			// 		id: interaction.guildId
			// 	}
			// });

			if (!data.countChannel) {
				await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} The counting game has **not** been **setup** yet`)], flags: MessageFlags.Ephemeral });
				return;
			}

			const countingChannel = interaction.guild.channels.cache.get(data.countChannel);

			if (!countingChannel || !countingChannel.isTextBased()) {
				await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} The counting game has **not** been **setup** yet`)], flags: MessageFlags.Ephemeral });
				return;
			}

			countingChannel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle('`🔢` Counting Game Reward')
						.setDescription(`${emojis.custom.success} The reward for reaching \`${count}\` counts has been set to \`${amount}\` coins`)
						.setColor(color.success)
				]
			});

			await interaction.reply({
				content: `${emojis.custom.success} The \`${amount}\` reward has been **setup** for **${count}** counts`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (subcommand === 'global') {
			const data = await GuildSchema.find({
				count: {
					$ne: 0
				}
			})
				.sort({ count: -1 })
				.limit(10);

			// const data = await this.container.db.guild.findMany({
			// 	where: {
			// 		count: {
			// 			not: 0
			// 		}
			// 	},
			// 	orderBy: {
			// 		count: 'desc'
			// 	},
			// 	take: 10
			// });

			if (!data.length || data.length === 0) {
				await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} No guild has counted yet`)], flags: MessageFlags.Ephemeral });
				return;
			}

			// Global leaderboard of guilds
			const leaderboard = data
				.map((g, index) => {
					const guild = this.container.client.guilds.cache.get(g.id);
					const guildName = guild ? guild.name : 'Unknown Guild';
					return `${index + 1}. ${guildName} - ${g.count}`;
				})
				.join('\n');

			await interaction.reply({
				embeds: [new EmbedBuilder().setTitle(`\`🌎\` Global Leaderboard`).setDescription(leaderboard).setColor(color.success)]
			});
		}

		if (subcommand === 'local') {
			const data = await GuildSchema.findOne({
				id: interaction.guildId
			});

			if (!data) {
				await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} The counting game has **not** been **setup** yet`)], flags: MessageFlags.Ephemeral });
				return;
			}

			const localLeaderboard = await CountActivity.find({
				guildId: interaction.guildId
			})
				.sort({ count: -1 })
				.limit(10);

			// const localLeaderboard = await this.container.db.countActivity.findMany({
			// 	where: {
			// 		AND: {
			// 			count: {
			// 				not: 0
			// 			},
			// 			guildId: interaction.guildId
			// 		}
			// 	},
			// 	orderBy: {
			// 		count: 'desc'
			// 	},
			// 	take: 10
			// });

			if (!localLeaderboard.length) {
				await interaction.reply({ embeds: [new EmbedBuilder().setColor(`${color.invis}`).setDescription(`${emojis.custom.fail} No member has counted yet`)], flags: MessageFlags.Ephemeral });
				return;
			}

			const leaderboard = localLeaderboard
				.map((user, index) => {
					const member = interaction.guild.members.cache.get(user.userId);
					const username = member ? member.user.username : 'Unknown User';
					return `${index + 1}. ${username} (${member}) - ${user.count}`;
				})
				.join('\n');

			await interaction.reply({
				embeds: [new EmbedBuilder().setTitle('`🌎` Local Leaderboard').setDescription(leaderboard).setColor(color.success)]
			});
		}
	}
}

module.exports = {
	UserCommand: countingCommand,
	countingCommand
};
