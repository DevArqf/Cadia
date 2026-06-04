const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('Top.gg poster is created once and reused across repeated calls', () => {
	process.env.BOT_OWNERS ??= 'test-owner';
	process.env.DEVELOPERS ??= 'test-developer';

	const topggPath = require.resolve('topgg-autoposter');
	const commandPath = path.join(root, 'src', 'commands', 'Systems', 'Top.gg', 'top-gg.js');
	const originalTopgg = require.cache[topggPath];
	const originalCommand = require.cache[commandPath];
	let posterCreations = 0;

	require.cache[topggPath] = {
		id: topggPath,
		filename: topggPath,
		loaded: true,
		exports: {
			AutoPoster: (_token, client) => {
				posterCreations++;
				client.fakeShardReadyListeners = (client.fakeShardReadyListeners ?? 0) + 1;
				client.fakeShardErrorListeners = (client.fakeShardErrorListeners ?? 0) + 1;

				return {
					on() {
						return this;
					},
					post() {}
				};
			}
		}
	};

	delete require.cache[commandPath];

	try {
		const { getTopggPoster } = require(commandPath);
		const client = { logger: { info() {}, error() {} } };

		const first = getTopggPoster(client, 'token');
		for (let index = 0; index < 20; index++) {
			const next = getTopggPoster(client, 'token');
			assert.equal(next.poster, first.poster);
			assert.equal(next.created, false);
		}

		assert.equal(first.created, true);
		assert.equal(posterCreations, 1);
		assert.equal(client.fakeShardReadyListeners, 1);
		assert.equal(client.fakeShardErrorListeners, 1);
	} finally {
		if (originalTopgg) require.cache[topggPath] = originalTopgg;
		else delete require.cache[topggPath];

		if (originalCommand) require.cache[commandPath] = originalCommand;
		else delete require.cache[commandPath];
	}
});

test('commands and listeners do not register permanent interactionCreate listeners at runtime', () => {
	const files = [
		path.join(root, 'src', 'listeners', 'botMention.js'),
		path.join(root, 'src', 'commands', 'Developer', 'bug-report.js')
	];

	for (const file of files) {
		const source = fs.readFileSync(file, 'utf8');
		assert.doesNotMatch(source, /\.(?:client|message\.client|interaction\.client)\.on\(['"]interactionCreate['"]/);
		assert.match(source, /createMessageComponentCollector/);
	}
});

test('Top.gg command does not create AutoPoster directly inside chatInputRun body', () => {
	const file = path.join(root, 'src', 'commands', 'Systems', 'Top.gg', 'top-gg.js');
	const source = fs.readFileSync(file, 'utf8');
	const chatInputRunBody = source.slice(source.indexOf('async chatInputRun'), source.indexOf('function getTopggPoster'));

	assert.doesNotMatch(chatInputRunBody, /AutoPoster\s*\(/);
	assert.match(chatInputRunBody, /getTopggPoster/);
});
