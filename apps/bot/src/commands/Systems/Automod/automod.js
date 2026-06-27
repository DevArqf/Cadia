const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../../config');
const { AutoModerationActionType, AutoModerationRuleEventType, AutoModerationRuleTriggerType, EmbedBuilder } = require('discord.js');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			requiredUserPermissions: ['Administrator'],
			requiredClientPermissions: ['ManageGuild'],
			description: 'Setup the AutoMod System within your server'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('automod')
				.setDescription(this.description)
				.addSubcommand((command) => command.setName('flagged-words').setDescription('Block profanity, sexual content, and slurs'))
				.addSubcommand((command) => command.setName('spam-messages').setDescription('Block messages suspected of spam'))
				.addSubcommand((command) =>
					command
						.setName('mention-spam')
						.setDescription('Block messages containing a certain amount of mentions')
						.addIntegerOption((option) =>
							option
								.setName('number')
								.setDescription('The number of mentions required to block a message')
								.setMinValue(1)
								.setMaxValue(50)
								.setRequired(true)
						)
				)
				.addSubcommand((command) =>
					command
						.setName('keyword')
						.setDescription('Block a given keyword in the server')
						.addStringOption((option) => option.setName('word').setDescription('The word you want to block').setRequired(true))
				)
		);
	}

	async chatInputRun(interaction) {
		await interaction.deferReply();

		try {
			const definition = getRuleDefinition(interaction.options);
			await interaction.guild.autoModerationRules.create({
				name: definition.name,
				enabled: true,
				eventType: AutoModerationRuleEventType.MessageSend,
				triggerType: definition.triggerType,
				triggerMetadata: definition.triggerMetadata,
				actions: [
					{
						type: AutoModerationActionType.BlockMessage,
						metadata: {
							customMessage: `This message was prevented by Cadia's Auto Moderation`
						}
					}
				],
				reason: `AutoMod rule created by ${interaction.user.tag}`
			});

			const embed = new EmbedBuilder()
				.setColor(color.success)
				.setDescription(
					`${emojis.custom.success} **Your AutoMod rule was created successfully.**\n${emojis.custom.arrowright} ${definition.successMessage}`
				);

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.warn(`AutoMod rule creation failed in ${interaction.guildId}: ${error.message}`);
			const errorEmbed = new EmbedBuilder()
				.setColor(color.fail)
				.setDescription(
					`${emojis.custom.fail} Cadia could not create that AutoMod rule. Check the bot's **Manage Server** permission and your server's existing AutoMod rule limits.`
				);

			return interaction.editReply({ embeds: [errorEmbed] });
		}
	}
}

function getRuleDefinition(options) {
	const subcommand = options.getSubcommand();

	switch (subcommand) {
		case 'flagged-words':
			return {
				name: 'Block profanity, sexual content, and slurs by Cadia',
				triggerType: AutoModerationRuleTriggerType.KeywordPreset,
				triggerMetadata: { presets: [1, 2, 3] },
				successMessage: 'Profanity, sexual content, and slurs will be blocked.'
			};
		case 'keyword': {
			const word = options.getString('word', true).trim();
			return {
				name: `Block "${word}" by Cadia`,
				triggerType: AutoModerationRuleTriggerType.Keyword,
				triggerMetadata: { keywordFilter: [word] },
				successMessage: `Messages containing **${word}** will be blocked.`
			};
		}
		case 'spam-messages':
			return {
				name: 'Prevent spam messages by Cadia',
				triggerType: AutoModerationRuleTriggerType.Spam,
				triggerMetadata: {},
				successMessage: 'Messages detected as spam will be blocked.'
			};
		case 'mention-spam': {
			const mentionLimit = options.getInteger('number', true);
			return {
				name: 'Prevent mention spam by Cadia',
				triggerType: AutoModerationRuleTriggerType.MentionSpam,
				triggerMetadata: { mentionTotalLimit: mentionLimit },
				successMessage: `Messages containing **${mentionLimit}** or more mentions will be blocked.`
			};
		}
		default:
			throw new Error(`Unsupported AutoMod subcommand: ${subcommand}`);
	}
}

module.exports = {
	UserCommand
};
