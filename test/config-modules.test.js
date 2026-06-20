const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

test('config compatibility facade exposes focused configuration modules', () => {
	const compatibility = require('../src/config');
	const { ClientConfig } = require('../src/config/client');
	const { branding } = require('../src/config/branding');
	const { channels } = require('../src/config/channels');
	const { color } = require('../src/config/colors');
	const { emojis } = require('../src/config/emojis');

	assert.equal(compatibility.ClientConfig, ClientConfig);
	assert.equal(compatibility.branding, branding);
	assert.equal(compatibility.channels, channels);
	assert.equal(compatibility.color, color);
	assert.equal(compatibility.emojis, emojis);
});

test('Discord application, command, and channel identifiers are owned by focused config modules', () => {
	const { branding } = require('../src/config/branding');
	const { channels } = require('../src/config/channels');

	for (const value of [
		branding.applicationId,
		branding.ownerUserId,
		branding.helpCommandId,
		branding.bugReportCommandId,
		branding.alertCommandId,
		channels.bugReportForum
	]) {
		assert.match(value, /^\d{17,20}$/);
	}
});
