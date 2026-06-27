const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { postTopggStats, retryTransientNetworkRequest, startTopggStatsPoster, syncTopggCommands } = require('../src/lib/util/topgg');
const { UserCommand: TopggCommand } = require('../src/commands/Systems/Top.gg/top-gg');

test('Top.gg command reports missing credentials without starting network work', async () => {
	const names = ['TOPGG_TOKEN', 'TOP_GG_TOKEN', 'TOPGG_API_TOKEN'];
	const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
	for (const name of names) delete process.env[name];
	const replies = [];

	try {
		await TopggCommand.prototype.chatInputRun.call(
			{},
			{
				deferReply: async () => {},
				editReply: async (reply) => replies.push(reply)
			}
		);
		assert.match(replies[0].content, /Missing `TOPGG_TOKEN`/);
		assert.equal(typeof postTopggStats, 'function');
		assert.equal(typeof syncTopggCommands, 'function');
		assert.equal(typeof startTopggStatsPoster, 'function');
	} finally {
		for (const name of names) {
			if (original[name] === undefined) delete process.env[name];
			else process.env[name] = original[name];
		}
	}
});

test('Top.gg retries transient DNS failures before surfacing an error', async () => {
	let attempts = 0;
	const result = await retryTransientNetworkRequest(async () => {
		attempts += 1;
		if (attempts < 3) throw Object.assign(new Error('temporary DNS failure'), { code: 'EAI_AGAIN' });
		return 'posted';
	}, [0, 0]);

	assert.equal(result, 'posted');
	assert.equal(attempts, 3);
});

test('Top.gg does not retry non-transient API failures', async () => {
	let attempts = 0;
	await assert.rejects(
		() =>
			retryTransientNetworkRequest(async () => {
				attempts += 1;
				throw Object.assign(new Error('unauthorized'), { response: { status: 401 } });
			}, [0, 0]),
		/unauthorized/
	);
	assert.equal(attempts, 1);
});
