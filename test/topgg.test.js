const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { retryTransientNetworkRequest } = require('../src/lib/util/topgg');

const root = path.resolve(__dirname, '..');

test('Top.gg command does not use topgg-autoposter', () => {
	const file = path.join(root, 'src', 'commands', 'Systems', 'Top.gg', 'top-gg.js');
	const source = fs.readFileSync(file, 'utf8');

	assert.doesNotMatch(source, /topgg-autoposter/);
	assert.doesNotMatch(source, /AutoPoster/);
	assert.doesNotMatch(source, /getTopggPoster/);
	assert.match(source, /postTopggStats/);
	assert.match(source, /startTopggStatsPoster/);
});

test('commands and listeners do not register permanent interactionCreate listeners at runtime', () => {
	const files = [path.join(root, 'src', 'listeners', 'botMention.js'), path.join(root, 'src', 'commands', 'Developer', 'bug-report.js')];

	for (const file of files) {
		const source = fs.readFileSync(file, 'utf8');
		assert.doesNotMatch(source, /\.(?:client|message\.client|interaction\.client)\.on\(['"]interactionCreate['"]/);
		assert.match(source, /createMessageComponentCollector/);
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
