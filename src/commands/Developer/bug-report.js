const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis, channels } = require('../../config');
const { ButtonStyle, MessageFlags } = require('discord.js');
const { BugReportBlacklist } = require('../../lib/schemas/bugreportSchema');
const { actionButton, componentReply, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Submit a bug report to the Developers of Cadia'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('bug-report')
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('send')
						.setDescription('Submit a bug report to the Developer of Cadia')
						.addStringOption((option) => option.setName('issue').setDescription('Describe the issue you encountered').setRequired(true))
						.addStringOption((option) =>
							option.setName('system').setDescription('What command or system did you find this bug in?').setRequired(true)
						)
						.addAttachmentOption((option) =>
							option.setName('image').setDescription('Attach an image related to the issue').setRequired(false)
						)
						.addStringOption((option) => option.setName('notes').setDescription('Additional notes for developers').setRequired(false))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('blacklist-user')
						.setDescription('Blacklist a user from executing the bug-report command')
						.addStringOption((option) => option.setName('user-id').setDescription('The ID of the user').setRequired(true))
						.addStringOption((option) =>
							option.setName('reason').setDescription('The reason for blacklisting the user').setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('unblacklist-user')
						.setDescription('Unblacklist a user from executing the bug-report command')
						.addStringOption((option) => option.setName('user-id').setDescription('The ID of the user').setRequired(true))
				)
		);
	}

	async chatInputRun(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'blacklist-user') return this.blacklistUser(interaction);
		if (subcommand === 'unblacklist-user') return this.unblacklistUser(interaction);
		return this.sendReport(interaction);
	}

	async blacklistUser(interaction) {
		if (!isDeveloper(interaction.user.id)) return unauthorized(interaction);

		const userId = interaction.options.getString('user-id', true);
		const reason = interaction.options.getString('reason') || 'No reason provided';
		if (!/^\d{17,20}$/.test(userId)) {
			return interaction.reply(
				componentReply(
					notice(`${emojis.custom.warning} **Invalid User ID**`, 'Please provide a valid Discord snowflake.', color.warning),
					true
				)
			);
		}

		const existing = await BugReportBlacklist.findOne({ userID: userId });
		if (existing) {
			return interaction.reply(
				componentReply(
					notice(`${emojis.custom.warning} **Already Blacklisted**`, `\`${userId}\` is already blocked from bug reports.`, color.warning),
					true
				)
			);
		}

		await BugReportBlacklist.create({ userID: userId, reason });
		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.success,
					title: `${emojis.custom.success} **Bug Report Access Blocked**`,
					subtitle: 'Developer moderation action',
					sections: [`${emojis.custom.person} **User ID:** \`${userId}\``, `${emojis.custom.pencil} **Reason:** ${reason}`],
					footer: `${emojis.custom.person} Updated by ${interaction.user.displayName}`
				}),
				true
			)
		);
	}

	async unblacklistUser(interaction) {
		if (!isDeveloper(interaction.user.id)) return unauthorized(interaction);

		const userId = interaction.options.getString('user-id', true);
		const removed = await BugReportBlacklist.findOneAndDelete({ userID: userId });
		if (!removed) {
			return interaction.reply(
				componentReply(
					notice(`${emojis.custom.warning} **Not Blacklisted**`, `\`${userId}\` was not blocked from bug reports.`, color.warning),
					true
				)
			);
		}

		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.success,
					title: `${emojis.custom.success} **Bug Report Access Restored**`,
					subtitle: 'Developer moderation action',
					sections: [`${emojis.custom.person} **User ID:** \`${userId}\``, `${emojis.custom.info} This user can submit bug reports again.`],
					footer: `${emojis.custom.person} Updated by ${interaction.user.displayName}`
				}),
				true
			)
		);
	}

	async sendReport(interaction) {
		const blocked = await BugReportBlacklist.findOne({ userID: interaction.user.id });
		if (blocked) {
			return interaction.reply(
				componentReply(
					notice(
						`${emojis.custom.warning} **Bug Reports Blocked**`,
						`You are blacklisted from submitting bug reports.\n${emojis.custom.arrowright} Reason: ${blocked.reason ?? 'No reason provided'}`,
						color.warning
					),
					true
				)
			);
		}

		const issue = interaction.options.getString('issue', true);
		const notes = interaction.options.getString('notes') || 'No notes provided';
		const image = interaction.options.getAttachment('image');
		const system = interaction.options.getString('system', true);
		const reportChannel = interaction.client.channels.cache.get(channels.bugReports);

		if (!reportChannel) {
			return interaction.reply(
				componentReply(
					notice(
						`${emojis.custom.fail} **Report Channel Missing**`,
						'The configured bug report channel is not cached or no longer exists.'
					),
					true
				)
			);
		}

		const reportId = `bug:${interaction.id}`;
		await interaction.reply(
			componentReply(
				panel({
					accentColor: color.success,
					title: `${emojis.custom.mail} **Bug Report Submitted**`,
					subtitle: 'The developers received your report',
					sections: [
						`${emojis.custom.warning} **Issue**\n${issue}`,
						`${emojis.custom.settings} **System:** ${system}`,
						`${emojis.custom.pencil} **Notes:** ${notes}`,
						`${emojis.custom.save} **Image:** ${image ? 'Attached below for developers.' : 'No image provided.'}`
					],
					footer: `${emojis.custom.info} Misusing this feature can result in a report blacklist.`
				})
			)
		);

		const sent = await reportChannel.send(
			componentReply(
				panel({
					accentColor: color.default,
					title: `${emojis.custom.mail} **New Bug Report**`,
					subtitle: `Report ID ${reportId}`,
					sections: [
						`${emojis.custom.person} **Reporter**\nUser: ${interaction.user}\nUser ID: \`${interaction.user.id}\``,
						`${emojis.custom.warning} **Issue**\n${issue}`,
						`${emojis.custom.settings} **System:** ${system}`,
						`${emojis.custom.pencil} **Notes:** ${notes}`,
						`${emojis.custom.save} **Image:** ${image ? image.url : 'No image provided.'}`
					],
					buttons: [actionButton(`${reportId}:solve`, 'Mark Solved', ButtonStyle.Success, emojis.custom.success)],
					footer: `${emojis.custom.clock} Submitted <t:${Math.floor(Date.now() / 1000)}:R>`
				})
			)
		);

		const collector = sent.createMessageComponentCollector({ time: 604_800_000 });
		collector.on('collect', async (i) => {
			if (!i.isButton() || i.customId !== `${reportId}:solve`) return;

			await i.update(
				componentReply(
					panel({
						accentColor: color.success,
						title: `${emojis.custom.success} **Bug Report Resolved**`,
						subtitle: `Report ID ${reportId}`,
						sections: [
							`${emojis.custom.person} **Reporter:** ${interaction.user}`,
							`${emojis.custom.warning} **Issue**\n${issue}`,
							`${emojis.custom.success} **Resolved by:** ${i.user}`
						],
						footer: `${emojis.custom.clock} Resolved <t:${Math.floor(Date.now() / 1000)}:R>`
					})
				)
			);
		});
	}
}

function isDeveloper(userId) {
	return (process.env.DEVELOPERS || '').split(/\s+/).filter(Boolean).includes(userId);
}

function unauthorized(interaction) {
	return interaction.reply(
		componentReply(notice(`${emojis.custom.forbidden} **Developer Only**`, 'You are not authorized to use this bug-report admin action.'), true)
	);
}

module.exports = {
	UserCommand
};
