const assert = require('node:assert/strict');
const test = require('node:test');
const { AutoModerationRuleTriggerType } = require('discord.js');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { UserCommand: AutomodCommand } = require('../src/commands/Systems/Automod/automod');

test('automod acknowledges before creating a keyword rule and edits the response', async () => {
	const calls = [];
	let createdRule = null;
	const interaction = {
		guildId: 'guild',
		user: { tag: 'developer#0001' },
		options: {
			getSubcommand: () => 'keyword',
			getString: () => 'spoiler'
		},
		guild: {
			autoModerationRules: {
				create: async (rule) => {
					calls.push('create');
					createdRule = rule;
				}
			}
		},
		deferReply: async () => calls.push('defer'),
		editReply: async (payload) => {
			calls.push('edit');
			return payload;
		}
	};

	await AutomodCommand.prototype.chatInputRun.call(commandContext(), interaction);

	assert.deepEqual(calls, ['defer', 'create', 'edit']);
	assert.equal(createdRule.triggerType, AutoModerationRuleTriggerType.Keyword);
	assert.deepEqual(createdRule.triggerMetadata, { keywordFilter: ['spoiler'] });
	assert.match(createdRule.actions[0].metadata.customMessage, /Cadia/);
});

test('automod creation failures are logged and return an edited failure response', async () => {
	const warnings = [];
	let response = null;
	const interaction = {
		guildId: 'guild',
		user: { tag: 'developer#0001' },
		options: { getSubcommand: () => 'spam-messages' },
		guild: {
			autoModerationRules: {
				create: async () => {
					throw new Error('rule limit reached');
				}
			}
		},
		deferReply: async () => null,
		editReply: async (payload) => {
			response = payload;
			return payload;
		}
	};

	await AutomodCommand.prototype.chatInputRun.call(commandContext(warnings), interaction);

	assert.match(warnings[0], /rule limit reached/);
	assert.match(response.embeds[0].data.description, /could not create/i);
});

function commandContext(warnings = []) {
	return {
		container: {
			logger: {
				warn: (message) => warnings.push(message)
			}
		}
	};
}
