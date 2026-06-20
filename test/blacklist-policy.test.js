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
	assert.equal(
		shouldAcknowledgeBeforeBlacklistCheck({ ...interaction, options: { getSubcommand: () => 'profile' } }),
		false
	);
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
