const { Collection, EmbedBuilder, MessageFlags } = require('discord.js');
const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color } = require('../../config/colors');
const { emojis } = require('../../config/emojis');
const { reject } = require('../../lib/moderation/workflow');

const PURGE_FILTERS = {
	all: () => true,
	links: (message) => /https?:\/\//i.test(message.content),
	bot: (message) => message.author.bot,
	invites: (message) => /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i.test(message.content),
	attachments: (message) => message.attachments.size > 0,
	images: (message) =>
		message.attachments.some(
			(attachment) => attachment.contentType?.startsWith('image/') || /\.(?:png|jpe?g|gif|webp)$/i.test(attachment.name || '')
		)
};

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Bulk deletes a given amount of messages. Limit is 100.',
			requiredUserPermissions: ['ManageMessages'],
			requiredClientPermissions: ['ManageMessages']
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('purge')
				.setDescription(this.description)
				.addIntegerOption((option) =>
					option.setName('amount').setDescription('Number of messages to purge').setMinValue(1).setMaxValue(100).setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('filter')
						.setDescription('Filter options for purging')
						.setRequired(true)
						.addChoices(
							{ name: 'All', value: 'all' },
							{ name: 'Links', value: 'links' },
							{ name: 'Bot Messages', value: 'bot' },
							{ name: 'Invites', value: 'invites' },
							{ name: 'Attachments', value: 'attachments' },
							{ name: 'Images', value: 'images' }
						)
				)
		);
	}

	async chatInputRun(interaction) {
		const amount = interaction.options.getInteger('amount', true);
		const filter = interaction.options.getString('filter', true);
		const predicate = PURGE_FILTERS[filter];
		if (!predicate) return reject(interaction, `${emojis.custom.fail} Select a valid purge filter.`);
		if (!interaction.channel?.messages || typeof interaction.channel.bulkDelete !== 'function') {
			return reject(interaction, `${emojis.custom.fail} This command can only be used in a server text channel.`);
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			const channelMessageLimit = amount;
			let deletedCount = 0;
			if (channelMessageLimit > 0) {
				const fetchOptions = { limit: channelMessageLimit };
				if (interaction.message?.id) fetchOptions.before = interaction.message.id;
				const fetched = await interaction.channel.messages.fetch(fetchOptions);
				const messages = selectPurgeMessages({ fetched, limit: channelMessageLimit, predicate });
				if (interaction.message?.id) messages.set(interaction.message.id, interaction.message);
				if (messages.size) {
					await interaction.channel.bulkDelete(messages, true);
					deletedCount = messages.size;
				}
			}
			await interaction.deleteReply().catch(() => null);
			const confirmation = await interaction.followUp({
				embeds: [
					new EmbedBuilder()
						.setColor(color.success)
						.setDescription(`${emojis.custom.success} Successfully purged **${deletedCount}** message(s).`)
						.setTimestamp()
				]
			});
			const deleteTimer = setTimeout(() => confirmation.delete().catch(() => null), 10_000);
			deleteTimer.unref?.();
			return null;
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor(color.fail)
						.setDescription(`${emojis.custom.fail} Cadia could not purge those messages. Check channel access and message age, then try again.`)
				]
			}).catch(() => null);
		}
	}
}

function selectPurgeMessages({ fetched, limit, predicate }) {
	const selected = new Collection();
	for (const [id, message] of fetched) {
		if (selected.size >= limit) break;
		if (predicate(message)) selected.set(id, message);
	}
	return selected;
}

module.exports = { UserCommand, selectPurgeMessages };
