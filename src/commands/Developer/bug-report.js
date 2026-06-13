const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ButtonStyle,
	ChannelType,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');
const { BugReportBlacklist } = require('../../lib/schemas/bugreportSchema');
const { actionButton, componentReply, notice, panel } = require('../../lib/util/components');

const bugReportForumChannelId = '1514152995108159588';
const maxForumTitleLength = 100;
const bugReportSeverities = [
	{ name: 'Critical', value: 'Critical' },
	{ name: 'Major', value: 'Major' },
	{ name: 'Minor', value: 'Minor' }
];
const bugIcon = {
	report: emojis.custom.bugcatcher || emojis.custom.mail,
	warning: emojis.custom.bugWarning || emojis.custom.warning,
	critical: emojis.custom.criticalBug || emojis.custom.warning,
	minor: emojis.custom.minorBug || emojis.custom.clock
};
const severityConfig = {
	Critical: { label: 'Critical', icon: bugIcon.critical, accent: color.fail, response: 'Immediate developer review recommended.' },
	Major: { label: 'Major', icon: bugIcon.warning, accent: color.warning, response: 'High priority issue for the next review pass.' },
	Minor: { label: 'Minor', icon: bugIcon.minor, accent: color.default, response: 'Low risk issue queued for routine triage.' }
};

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
						.addStringOption((option) =>
							option.setName('title').setDescription('Short title for the bug report forum post').setMaxLength(100).setRequired(true)
						)
						.addStringOption((option) =>
							option.setName('description').setDescription('Describe the issue you encountered').setMaxLength(1800).setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('severity')
								.setDescription('How severe is this bug?')
								.setRequired(true)
								.addChoices(...bugReportSeverities)
						)
						.addAttachmentOption((option) =>
							option.setName('image-1').setDescription('Attach an image related to the issue').setRequired(false)
						)
						.addAttachmentOption((option) =>
							option.setName('image-2').setDescription('Attach another image related to the issue').setRequired(false)
						)
						.addAttachmentOption((option) =>
							option.setName('image-3').setDescription('Attach another image related to the issue').setRequired(false)
						)
						.addStringOption((option) =>
							option.setName('system').setDescription('What command or system did you find this bug in?').setRequired(false)
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
		if (!isDeveloper(interaction.user.id)) return unauthorized(interaction);

		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'blacklist-user') return this.blacklistUser(interaction);
		if (subcommand === 'unblacklist-user') return this.unblacklistUser(interaction);
		return this.sendReport(interaction);
	}

	async blacklistUser(interaction) {
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
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const blocked = await BugReportBlacklist.findOne({ userID: interaction.user.id });
		if (blocked) {
			return interaction.editReply(
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

		const title = interaction.options.getString('title', true);
		const description = interaction.options.getString('description', true);
		const severity = interaction.options.getString('severity', true);
		const severityDetails = getSeverityDetails(severity);
		const notes = interaction.options.getString('notes') || 'No notes provided';
		const images = ['image-1', 'image-2', 'image-3'].map((name) => interaction.options.getAttachment(name)).filter(isImageAttachment);
		const rejectedAttachments = ['image-1', 'image-2', 'image-3']
			.map((name) => interaction.options.getAttachment(name))
			.filter((attachment) => attachment && !isImageAttachment(attachment));
		const system = interaction.options.getString('system') || 'Not specified';
		const reportChannel =
			interaction.client.channels.cache.get(bugReportForumChannelId) ||
			(await interaction.client.channels.fetch(bugReportForumChannelId).catch(() => null));

		if (!reportChannel || reportChannel.type !== ChannelType.GuildForum) {
			return interaction.editReply(
				componentReply(
					notice(
						`${emojis.custom.fail} **Bug Report Forum Missing**`,
						`The configured bug report forum channel \`${bugReportForumChannelId}\` is not available or is not a forum channel.`
					),
					true
				)
			);
		}

		const severityTag = resolveForumTag(reportChannel, severity);
		if (!severityTag) {
			return interaction.editReply(
				componentReply(
					notice(
						`${emojis.custom.fail} **Bug Report Tags Missing**`,
						`I could not find a forum tag named **${severity}** in <#${bugReportForumChannelId}>. Add the Critical, Major, and Minor tags to the forum before reports can be submitted.`,
						color.fail
					),
					true
				)
			);
		}

		const reportId = `bug:${interaction.id}`;
		const thread = await reportChannel.threads.create({
			name: forumPostTitle(title, interaction.user.username),
			appliedTags: [severityTag.id],
			message: buildBugReportMessage({
				reportId,
				reporter: interaction.user,
				title,
				description,
				severity,
				system,
				notes,
				images
			})
		});

		await interaction.editReply(
			componentReply(
				panel({
					accentColor: severityDetails.accent,
					title: `${bugIcon.report} **Bug Report Submitted**`,
					subtitle: `${severityDetails.icon} ${severityDetails.label} report routed to the developer forum`,
					sections: [
						[
							`${emojis.custom.success} **Status:** Submitted`,
							`${severityDetails.icon} **Severity:** **${severityDetails.label}**`,
							`${emojis.custom.settings} **System:** ${system}`,
							`${emojis.custom.clock} **Submitted:** <t:${Math.floor(Date.now() / 1000)}:R>`
						].join('\n'),
						[`${bugIcon.report} **${title}**`, description, '', `${emojis.custom.pencil} **Notes:** ${notes}`].join('\n'),
						[
							`${emojis.custom.save} **Evidence:** ${formatImageSummary(images, 'attached for developers')}`,
							rejectedAttachments.length
								? `${bugIcon.warning} **Skipped Files:** ${rejectedAttachments.length} attachment(s) were not images.`
								: null,
							`${emojis.custom.link} **Developer Thread:** ${thread.url}`,
							`${emojis.custom.info} ${severityDetails.response}`
						]
							.filter(Boolean)
							.join('\n')
					],
					footer: `${emojis.custom.info} Keep the forum thread handy if developers ask for more details.`
				})
			)
		);

		const sent = await thread.fetchStarterMessage().catch(() => null);
		if (!sent) return;

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
							[
								`${emojis.custom.person} **Reporter:** ${interaction.user}`,
								`${bugIcon.report} **Title**\n${title}`,
								`${emojis.custom.pencil} **Description**\n${description}`,
								`${severityDetails.icon} **Severity:** ${severityDetails.label}`,
								`${emojis.custom.success} **Resolved by:** ${i.user}`
							].join('\n\n')
						],
						footer: `${emojis.custom.clock} Resolved <t:${Math.floor(Date.now() / 1000)}:R>`
					})
				)
			);
		});
	}
}

function buildBugReportMessage({ reportId, reporter, title, description, severity, system, notes, images }) {
	const severityDetails = getSeverityDetails(severity);
	const container = panel({
		accentColor: severityDetails.accent,
		title: `${bugIcon.report} ${severityDetails.icon} **${severityDetails.label} Bug Report**`,
		subtitle: `${title} - ${reportId}`,
		sections: [
			[
				`${severityDetails.icon} **Severity:** **${severityDetails.label}**`,
				`${emojis.custom.settings} **System:** ${system}`,
				`${emojis.custom.clock} **Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>`,
				`${emojis.custom.person} **Reporter:** ${reporter} (\`${reporter.id}\`)`
			].join('\n'),
			[
				`${emojis.custom.pencil} **Description**`,
				description,
				'',
				`${emojis.custom.pencil} **Notes:** ${notes}`,
				`${emojis.custom.save} **Evidence:** ${formatImageSummary(images, 'submitted')}`
			].join('\n'),
			[
				`${emojis.custom.info} **Triage Hint:** ${severityDetails.response}`,
				`${emojis.custom.arrowright} Use **Mark Solved** after the fix is shipped or the report is closed.`
			].join('\n')
		],
		buttons: [actionButton(`${reportId}:solve`, 'Mark Solved', ButtonStyle.Success, emojis.custom.success)],
		footer: `${emojis.custom.clock} Submitted <t:${Math.floor(Date.now() / 1000)}:R>`
	});

	if (images.length) {
		container
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.save} **Submitted Images**`))
			.addMediaGalleryComponents(
				new MediaGalleryBuilder().addItems(...images.slice(0, 3).map((image) => new MediaGalleryItemBuilder().setURL(image.url)))
			);
	}

	return {
		components: [container],
		flags: MessageFlags.IsComponentsV2
	};
}

function getSeverityDetails(severity) {
	const normalizedSeverity = normalizeForumTagName(severity);
	const key = Object.keys(severityConfig).find((severityKey) => normalizeForumTagName(severityKey) === normalizedSeverity);
	return severityConfig[key] || severityConfig.Minor;
}

function isImageAttachment(attachment) {
	if (!attachment) return false;
	return attachment.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(attachment.name || attachment.url || '');
}

function formatImageSummary(images, suffix) {
	return images.length ? `${images.length} image${images.length === 1 ? '' : 's'} ${suffix}.` : 'No images provided.';
}

function resolveForumTag(channel, severity) {
	const requested = normalizeForumTagName(severity);
	return channel.availableTags.find((tag) => normalizeForumTagName(tag.name) === requested) || null;
}

function normalizeForumTagName(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function forumPostTitle(title, username) {
	const base = `[Bug] ${title} - ${username}`;
	return base.length <= maxForumTitleLength ? base : `${base.slice(0, maxForumTitleLength - 3)}...`;
}

function isDeveloper(userId) {
	return (process.env.DEVELOPERS || '').split(/\s+/).filter(Boolean).includes(userId);
}

function unauthorized(interaction) {
	return interaction.reply(
		componentReply(notice(`${emojis.custom.forbidden} **Developer Only**`, 'Only bot developers can use the bug-report command.'), true)
	);
}

module.exports = {
	UserCommand
};
