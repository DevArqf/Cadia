const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { PermissionFlagsBits } = require('discord.js');
const { countingCommand } = require('../src/commands/Systems/Counting/counting');

test('counting configuration requires Manage Server while leaderboards remain public', async () => {
	const replies = [];
	const interaction = {
		member: { permissions: { has: (permission) => permission !== PermissionFlagsBits.ManageGuild } },
		options: { getSubcommand: () => 'setup' },
		reply: async (payload) => replies.push(payload)
	};

	await countingCommand.prototype.chatInputRun.call({}, interaction);

	assert.equal(replies.length, 1);
	assert.match(replies[0].content, /Manage Server/i);
});

test('counting deletes non-integer messages without resetting valid progress', async () => {
	const loaded = loadCounting({ count: 4, countHighscore: 4 });
	let deleted = false;
	const message = createMessage('hello', {
		delete: async () => {
			await delay();
			deleted = true;
		}
	});

	try {
		await loaded.UserEvent.prototype.run.call(loaded.context, message);
		assert.equal(deleted, true);
		assert.equal(loaded.guildUpdates.length, 0);
		assert.equal(loaded.channelMessages.length, 0);
	} finally {
		loaded.restore();
	}
});

test('counting records the current number as the high score and awaits goal responses', async () => {
	const loaded = loadCounting({ count: 4, countGoal: 5, countHighscore: 4 });
	const completed = [];
	const message = createMessage('5', {
		reply: async () => {
			await delay();
			completed.push('reply');
		},
		pin: async () => {
			await delay();
			completed.push('pin');
		}
	});

	try {
		await loaded.UserEvent.prototype.run.call(loaded.context, message);
		assert.equal(loaded.guildUpdates[0].$set.count, 5);
		assert.equal(loaded.guildUpdates[0].$set.countHighscore, 5);
		assert.deepEqual(completed, ['reply', 'pin']);
		assert.deepEqual(loaded.emitted, ['successfulCount', 5]);
	} finally {
		loaded.restore();
	}
});

function loadCounting(guildRecord) {
	const paths = {
		guild: require.resolve('../src/lib/schemas/guildSchema'),
		count: require.resolve('../src/lib/schemas/countSchema'),
		listener: require.resolve('../src/listeners/messages/counting/counting')
	};
	const originals = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, require.cache[value]]));
	const guildUpdates = [];
	const channelMessages = [];
	const emitted = [];
	const channel = {
		id: 'counting',
		isTextBased: () => true,
		send: async (payload) => {
			channelMessages.push(payload);
		}
	};

	require.cache[paths.guild] = moduleWith({
		GuildSchema: {
			findOne: async () => ({ countChannel: channel.id, ...guildRecord }),
			updateOne: async (_filter, update) => {
				guildUpdates.push(update);
			}
		}
	});
	require.cache[paths.count] = moduleWith({
		CountActivity: { findOneAndUpdate: async () => null }
	});
	delete require.cache[paths.listener];
	const { UserEvent } = require(paths.listener);

	return {
		UserEvent,
		guildUpdates,
		channelMessages,
		emitted,
		context: {
			container: {
				client: {
					emit: (event, _message, count) => emitted.push(event, count)
				}
			}
		},
		channel,
		restore() {
			for (const [key, modulePath] of Object.entries(paths)) {
				if (originals[key]) require.cache[modulePath] = originals[key];
				else delete require.cache[modulePath];
			}
		}
	};
}

function createMessage(content, overrides = {}) {
	const channel = {
		id: 'counting',
		isTextBased: () => true,
		send: async () => null
	};
	return {
		content,
		author: { id: 'user', toString: () => '<@user>' },
		channel,
		guild: {
			id: 'guild',
			channels: { cache: new Map([[channel.id, channel]]) }
		},
		deletable: true,
		reactable: false,
		pinnable: true,
		delete: async () => null,
		reply: async () => null,
		pin: async () => null,
		...overrides
	};
}

function moduleWith(exports) {
	return { id: 'test-double', filename: 'test-double', loaded: true, exports };
}

function delay() {
	return new Promise((resolve) => setTimeout(resolve, 5));
}
