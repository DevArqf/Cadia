const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
