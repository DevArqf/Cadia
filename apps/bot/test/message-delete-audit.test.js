const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { formatDeletedMessageContent } = require('../src/listeners/audit/messageDelete');

test('deleted message audit content is wrapped in inline code', () => {
	assert.equal(formatDeletedMessageContent('<settings:1519116853367017525>'), '`<settings:1519116853367017525>`');
});

test('deleted message audit content fallback is also wrapped', () => {
	assert.equal(formatDeletedMessageContent(''), '`No text content captured.`');
});

test('deleted message audit content escapes backticks', () => {
	assert.equal(formatDeletedMessageContent('hello `world`'), '`hello \\`world\\``');
});
