const assert = require('node:assert/strict');
const test = require('node:test');
const { Collection } = require('discord.js');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

test('warmed blacklist policy serves command checks without repeated database reads', async () => {
	const schemaPath = require.resolve('../src/lib/schemas/blacklistSchema');
	const policyPath = require.resolve('../src/lib/policies/blacklist');
	const originalSchema = require.cache[schemaPath];
	const originalPolicy = require.cache[policyPath];
	let reads = 0;

	require.cache[schemaPath] = moduleWith({
		find: async () => {
			reads += 1;
			return [{ guildId: 'blocked' }];
		},
		findOne: async () => {
			reads += 1;
			return null;
		}
	});
	delete require.cache[policyPath];

	try {
		const policy = require(policyPath);
		await policy.initializeBlacklistCache();
		assert.equal((await policy.getGuildBlacklist('blocked', 'user')).guildId, 'blocked');
		assert.equal(await policy.getGuildBlacklist('allowed', 'user'), null);
		assert.equal(reads, 1);
	} finally {
		restoreModule(schemaPath, originalSchema);
		restoreModule(policyPath, originalPolicy);
	}
});

test('help command catalog is built once and reused', () => {
	const { getCommandCatalog } = require('../src/commands/Miscellaneous/help');
	const first = getCommandCatalog();
	const second = getCommandCatalog();

	assert.equal(first, second);
	assert.ok(first.some((category) => category.id === 'rpg'));
});

test('help category select can be handled globally after restart', async () => {
	const { handleHelpInteraction } = require('../src/commands/Miscellaneous/help');
	const updates = [];
	const interaction = {
		client: {
			generateInvite: () => 'https://example.com/invite',
			user: { displayAvatarURL: () => 'https://example.com/bot.png' }
		},
		customId: 'help:user:category',
		isStringSelectMenu: () => true,
		reply: assert.fail,
		update: async (payload) => updates.push(payload),
		user: { id: 'user' },
		values: ['rpg']
	};

	const handled = await handleHelpInteraction(interaction);

	assert.equal(handled, true);
	assert.equal(updates.length, 1);
	assert.ok(JSON.stringify(updates[0].components).includes('RPG Leaderboard') || JSON.stringify(updates[0].components).includes('rpg leaderboard'));
});

test('ping refresh can be handled globally after restart', async () => {
	const { handlePingInteraction } = require('../src/commands/Miscellaneous/ping');
	const updates = [];
	const interaction = {
		client: {
			user: { displayAvatarURL: () => 'https://example.com/bot.png' },
			ws: { ping: 42 }
		},
		createdTimestamp: Date.now(),
		customId: 'ping:user:refresh',
		isButton: () => true,
		reply: assert.fail,
		update: async (payload) => updates.push(payload),
		user: { id: 'user' }
	};

	const handled = await handlePingInteraction(interaction);

	assert.equal(handled, true);
	assert.equal(updates.length, 1);
	assert.ok(JSON.stringify(updates[0].components).includes('Cadia Latency'));
});

test('bot mention response uses the gateway cache without fetching every guild', async () => {
	const { UserEvent } = require('../src/listeners/botMention');
	const listener = Object.create(UserEvent.prototype);
	Object.defineProperty(listener, 'container', {
		value: {
			logger: { error() {} },
			stores: { get: () => ({ size: 10 }) }
		}
	});
	let fetches = 0;
	const client = {
		emojis: { cache: new Collection() },
		generateInvite: () => 'https://example.com/invite',
		guilds: {
			cache: new Collection([['guild', { memberCount: 12 }]]),
			fetch: async () => {
				fetches += 1;
			}
		},
		user: { id: '123456789012345678' }
	};

	await listener.run({
		author: {
			bot: false,
			displayAvatarURL: () => 'https://example.com/avatar.png',
			id: 'user',
			username: 'Warden'
		},
		client,
		mentions: { users: { has: () => true } },
		reply: async () => ({
			id: 'reply'
		})
	});

	assert.equal(fetches, 0);
});

function moduleWith(exports) {
	return { id: 'test-double', filename: 'test-double', loaded: true, exports };
}

function restoreModule(modulePath, original) {
	if (original) require.cache[modulePath] = original;
	else delete require.cache[modulePath];
}
