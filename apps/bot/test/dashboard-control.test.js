const assert = require('node:assert/strict');
const test = require('node:test');
const { AutoModerationActionType, AutoModerationRuleTriggerType } = require('discord.js');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const {
	MODULES,
	buildCommandCatalog,
	buildDashboardCatalog,
	getCommandPolicy,
	getModulePolicy,
	isCommandEnabled,
	isDeveloperCommand,
	normalizeStoredConfig,
	resolveModuleId
} = require('../src/lib/runtime/guildCommandConfig');
const { evaluateCommandPolicy } = require('../src/preconditions/global/GuildCommandConfig');
const {
	buildRuleDefinitions,
	normalizeAutoModConfig,
	syncAutoModRules
} = require('../src/lib/automod/autoModService');

test('dashboard modules expose user-configurable systems and exclude developer blacklist controls', () => {
	assert.deepEqual(
		Object.values(MODULES).map((module) => module.name).sort(),
		['Automod', 'Counting', 'Levelling', 'Logging', 'Minigame', 'RPG System', 'Suggestions', 'Tickets', 'Top.gg', 'Welcoming']
	);
	assert.equal(resolveModuleId(fakeCommand('blacklist-add', 'Systems', 'Blacklist')), null);
});

test('dashboard command catalog is built from the live Sapphire command store', () => {
	const vote = fakeCommand('vote', 'Systems', 'Top.gg');
	const automod = fakeCommand('automod', 'Systems', 'Automod');
	const ping = fakeCommand('ping', 'General', 'General');
	const evalCommand = fakeCommand('eval', 'Developer', 'Developer');
	const client = { stores: { get: () => new Map([['vote', vote], ['automod', automod], ['ping', ping], ['eval', evalCommand]]) } };
	const catalog = buildCommandCatalog(client, {
		modules: { topgg: false },
		commands: { automod: { enabled: false } }
	});

	assert.deepEqual(catalog.map((module) => module.id), ['automod']);
	assert.equal(catalog.find((module) => module.id === 'automod').commands[0].enabled, false);
	assert.equal(resolveModuleId(vote), 'topgg');
	assert.equal(resolveModuleId(ping), null);
	assert.equal(isDeveloperCommand(evalCommand), true);
	assert.equal(catalog.some((module) => module.commands.some((command) => command.name === 'eval')), false);
});

test('commands outside the Systems directory do not create dashboard modules or inherit stale policies', () => {
	const ping = fakeCommand('ping', 'General', 'General');
	const client = { stores: { get: () => new Map([['ping', ping]]) } };

	assert.deepEqual(buildCommandCatalog(client), []);
	assert.equal(isCommandEnabled({ modules: { other: false }, commands: { ping: { enabled: false } } }, ping), false);
	assert.deepEqual(buildDashboardCatalog(client).commands.map((command) => command.name), ['ping']);
});

test('vote commands remain enabled despite stale dashboard disable policies', () => {
	const vote = fakeCommand('vote', 'Systems', 'Top.gg');
	assert.equal(isCommandEnabled(null, vote), true);
	assert.equal(isCommandEnabled({ modules: { topgg: false }, commands: {} }, vote), true);
	assert.equal(isCommandEnabled({ modules: {}, commands: { vote: { enabled: false } } }, vote), true);
	assert.equal(isCommandEnabled({ modules: { topgg: true }, commands: { vote: { enabled: true } } }, vote), true);
});

test('dashboard command updates reject unknown catalog entries', () => {
	const catalog = [{ id: 'topgg', commands: [{ name: 'vote' }] }];
	const normalized = normalizeStoredConfig(
		{
			modules: { topgg: false, injected: false },
			commands: { vote: { enabled: false }, eval: { enabled: false } }
		},
		catalog
	);

	assert.deepEqual(normalized.modules, {
		topgg: { enabled: true, response: '', cooldown: 0, allowedRoleIds: [], restrictedRoleIds: [] }
	});
	assert.deepEqual(normalized.commands, {
		vote: {
			enabled: true,
			response: '',
			cooldown: 0,
			allowedRoleIds: [],
			allowedChannelIds: [],
			ignoredChannelIds: [],
			ignoredRoleIds: []
		}
	});
});

test('dashboard policies retain live module and command customization', () => {
	const catalog = [{ id: 'topgg', commands: [{ name: 'vote' }] }];
	const normalized = normalizeStoredConfig(
		{
			modules: {
				topgg: {
					enabled: false,
					response: 'The {module} module is unavailable.',
					cooldown: 15,
					allowedRoleIds: ['12345678901234567']
				}
			},
			commands: {
				vote: {
					enabled: true,
					cooldown: 5,
					allowedChannelIds: ['22345678901234567'],
					ignoredRoleIds: ['32345678901234567']
				}
			}
		},
		catalog
	);

	assert.equal(getModulePolicy(normalized, 'topgg').response, 'The {module} module is unavailable.');
	assert.equal(getModulePolicy(normalized, 'topgg').cooldown, 15);
	assert.deepEqual(getCommandPolicy(normalized, 'vote').allowedChannelIds, ['22345678901234567']);
	assert.deepEqual(getCommandPolicy(normalized, 'vote').ignoredRoleIds, ['32345678901234567']);
});

test('Discord policy evaluation ignores disable flags for immutable vote commands', () => {
	const vote = fakeCommand('vote', 'Systems', 'Top.gg');
	const moduleResult = evaluateCommandPolicy(
		{ modules: { topgg: { enabled: false, response: '{module} has been disabled.' } } },
		vote
	);
	const commandResult = evaluateCommandPolicy(
		{ modules: { topgg: true }, commands: { vote: { enabled: false } } },
		vote
	);

	assert.equal(moduleResult.allowed, true);
	assert.equal(commandResult.allowed, true);
});

test('Discord policy evaluation enforces dashboard role, channel, and cooldown settings', () => {
	const vote = fakeCommand('vote', 'Systems', 'Top.gg');
	const config = {
		modules: { topgg: { enabled: true, cooldown: 30, allowedRoleIds: ['12345678901234567'] } },
		commands: { vote: { enabled: true, allowedChannelIds: ['22345678901234567'] } }
	};

	assert.equal(evaluateCommandPolicy(config, vote, { roleIds: [], channelId: '22345678901234567' }).error.identifier, 'ModuleRoleRestricted');
	assert.equal(
		evaluateCommandPolicy(config, vote, { roleIds: ['12345678901234567'], channelId: '99999999999999999' }).error.identifier,
		'CommandChannelRestricted'
	);
	assert.equal(
		evaluateCommandPolicy(config, vote, { roleIds: ['12345678901234567'], channelId: '22345678901234567' }).cooldown,
		30
	);
});

test('AutoMod dashboard values are bounded to Discord limits', () => {
	const config = normalizeAutoModConfig({
		enabled: true,
		filters: {
			mentionLimit: 999,
			keywords: Array.from({ length: 1_010 }, (_, index) => `keyword-${index}`),
			regexPatterns: Array.from({ length: 15 }, (_, index) => `pattern-${index}`),
			allowList: ['safe', 'safe']
		},
		actions: { customMessage: 'x'.repeat(200), timeoutSeconds: 9_999_999 },
		exemptRoleIds: Array.from({ length: 25 }, (_, index) => (10_000_000_000_000_000n + BigInt(index)).toString())
	});

	assert.equal(config.filters.mentionLimit, 50);
	assert.equal(config.filters.keywords.length, 1_000);
	assert.equal(config.filters.regexPatterns.length, 10);
	assert.deepEqual(config.filters.allowList, ['safe']);
	assert.equal(config.actions.customMessage.length, 150);
	assert.equal(config.actions.timeoutSeconds, 2_419_200);
	assert.equal(config.exemptRoleIds.length, 20);
});

test('AutoMod applies timeouts only to supported keyword and mention rules', () => {
	const config = normalizeAutoModConfig({
		enabled: true,
		filters: { keywords: ['blocked'], spam: true, mentionSpam: true },
		actions: { blockMessage: true, alertChannelId: '12345678901234567', timeoutSeconds: 60 }
	});
	const definitions = buildRuleDefinitions(config);
	const timeoutType = AutoModerationActionType.Timeout;

	assert.equal(definitions.spam.actions.some((action) => action.type === timeoutType), false);
	assert.equal(definitions.preset.actions.some((action) => action.type === timeoutType), false);
	assert.equal(definitions.keyword.actions.some((action) => action.type === timeoutType), true);
	assert.equal(definitions.mention.actions.some((action) => action.type === timeoutType), true);
	assert.equal(definitions.mention.triggerType, AutoModerationRuleTriggerType.MentionSpam);
});

test('AutoMod synchronization creates Cadia-owned native Discord rules', async () => {
	const created = [];
	const guild = {
		autoModerationRules: {
			fetch: async () => null,
			create: async (options) => {
				created.push(options);
				return { id: `rule-${created.length}` };
			}
		}
	};
	const config = normalizeAutoModConfig({
		enabled: true,
		filters: { profanity: true, spam: true, mentionSpam: true, keywords: ['blocked'] },
		actions: { blockMessage: true }
	});
	const ruleIds = await syncAutoModRules(guild, config, true);

	assert.equal(created.length, 4);
	assert.deepEqual(Object.keys(ruleIds).sort(), ['keyword', 'mention', 'preset', 'spam']);
	assert.ok(created.every((rule) => rule.enabled));
});

function fakeCommand(name, category, subCategory) {
	return {
		name,
		description: `${name} description`,
		category,
		subCategory,
		fullCategory: [category, subCategory],
		supportsChatInputCommands: () => true,
		supportsMessageCommands: () => true,
		supportsContextMenuCommands: () => false
	};
}
