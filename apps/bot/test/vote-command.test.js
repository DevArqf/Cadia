const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { branding } = require('../src/config');
const { buildVoteResponse } = require('../src/commands/Systems/Top.gg/vote');
const fs = require('node:fs');
const path = require('node:path');

test('vote command explicitly clears stale Discord member permission restrictions', () => {
	const source = fs.readFileSync(path.resolve(__dirname, '../src/commands/Systems/Top.gg/vote.js'), 'utf8');
	assert.match(source, /setDefaultMemberPermissions\(null\)/);
});

test('vote panel remains available after a user has already voted', () => {
	const response = buildVoteResponse({
		displayAvatarURL: () => 'https://example.com/avatar.png',
		displayName: 'Warden'
	});
	const serialized = JSON.stringify(response);

	assert.equal(response.embeds.length, 1);
	assert.equal(response.components[0].components.length, 3);
	assert.match(serialized, new RegExp(`top\\.gg/bot/${branding.applicationId}`));
	assert.doesNotMatch(serialized, /already voted/i);
});
