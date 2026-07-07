const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { shouldAcknowledgeBeforeBlacklistCheck } = require('../src/preconditions/global/Blacklist');

test('season interactions are acknowledged before the global blacklist database check', () => {
	const interaction = {
		commandName: 'rpg',
		options: { getSubcommand: () => 'season' }
	};

	assert.equal(shouldAcknowledgeBeforeBlacklistCheck(interaction), true);
	assert.equal(shouldAcknowledgeBeforeBlacklistCheck({ ...interaction, options: { getSubcommand: () => 'profile' } }), false);
});

test('blacklist policy bypasses privileged users and queries normal guilds', async () => {
	const schemaPath = require.resolve('../src/lib/schemas/blacklistSchema');
	const policyPath = require.resolve('../src/lib/policies/blacklist');
	const originalSchema = require.cache[schemaPath];
	const originalPolicy = require.cache[policyPath];
	const calls = [];

	require.cache[schemaPath] = {
		id: schemaPath,
		filename: schemaPath,
		loaded: true,
		exports: {
			findOne: async (filter) => {
				calls.push(filter);
				return { guildId: filter.guildId };
			}
		}
	};
	delete require.cache[policyPath];

	try {
		const { getGuildBlacklist } = require(policyPath);
		assert.equal(await getGuildBlacklist('guild', 'owner'), null);
		assert.deepEqual(await getGuildBlacklist('guild', 'normal-user'), { guildId: 'guild' });
		assert.deepEqual(calls, [{ guildId: 'guild' }]);
	} finally {
		if (originalSchema) require.cache[schemaPath] = originalSchema;
		else delete require.cache[schemaPath];
		if (originalPolicy) require.cache[policyPath] = originalPolicy;
		else delete require.cache[policyPath];
	}
});

test('blacklist add rejects malformed guild IDs before database and cache access', async () => {
	const schemaPath = require.resolve('../src/lib/schemas/blacklistSchema');
	const commandPath = require.resolve('../src/commands/Developer/Blacklist/blacklist-add');
	const originalSchema = require.cache[schemaPath];
	const originalCommand = require.cache[commandPath];
	let databaseReads = 0;
	let cacheReads = 0;
	const replies = [];

	require.cache[schemaPath] = {
		id: schemaPath,
		filename: schemaPath,
		loaded: true,
		exports: {
			findOne: async () => {
				databaseReads += 1;
				return null;
			}
		}
	};
	delete require.cache[commandPath];

	try {
		const { UserCommand } = require(commandPath);
		await UserCommand.prototype.chatInputRun.call(
			{},
			{
				client: {
					channels: { cache: new Map() },
					guilds: {
						cache: {
							get() {
								cacheReads += 1;
								return null;
							}
						}
					}
				},
				options: {
					getString(name) {
						return name === 'server-id' ? 'invalid-id' : null;
					}
				},
				reply: async (reply) => replies.push(reply),
				user: { displayName: 'Developer', displayAvatarURL: () => 'https://example.com/avatar.png' }
			}
		);

		assert.equal(databaseReads, 0);
		assert.equal(cacheReads, 0);
		assert.match(replies[0].embeds[0].data.description, /valid Discord server ID/i);
	} finally {
		if (originalSchema) require.cache[schemaPath] = originalSchema;
		else delete require.cache[schemaPath];
		if (originalCommand) require.cache[commandPath] = originalCommand;
		else delete require.cache[commandPath];
	}
});
