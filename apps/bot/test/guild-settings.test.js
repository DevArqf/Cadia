const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { ClientConfig } = require('../src/config');
const {
	DEFAULT_PREFIX,
	getGuildPrefix,
	normalizeGuildPrefix,
	serializeGuildSettings
} = require('../src/lib/runtime/guildSettings');
const { normalizeBotNickname } = require('../src/lib/ipc/botIpcServer');

test('Sapphire resolves message prefixes through per-guild settings', async () => {
	assert.equal(ClientConfig.defaultPrefix, DEFAULT_PREFIX);
	assert.equal(ClientConfig.fetchPrefix, getGuildPrefix);
	assert.equal(await ClientConfig.fetchPrefix({ guildId: null }), DEFAULT_PREFIX);
});

test('guild prefixes preserve intentional spacing and enforce Discord-safe input limits', () => {
	assert.equal(normalizeGuildPrefix('!'), '!');
	assert.equal(normalizeGuildPrefix('cadia '), 'cadia ');
	assert.equal(serializeGuildSettings({ prefix: '?' }, 'guild').prefix, '?');
	assert.equal(serializeGuildSettings(null, 'guild').prefix, DEFAULT_PREFIX);
	assert.throws(() => normalizeGuildPrefix(''), /cannot be empty/);
	assert.throws(() => normalizeGuildPrefix('123456789'), /8 characters/);
	assert.throws(() => normalizeGuildPrefix('bad\n'), /line breaks/);
});

test('dashboard nickname validation supports reset and Discord limits', () => {
	assert.equal(normalizeBotNickname(' Cadia Helper '), 'Cadia Helper');
	assert.equal(normalizeBotNickname('   '), null);
	assert.throws(() => normalizeBotNickname('x'.repeat(33)), /32 characters/);
	assert.throws(() => normalizeBotNickname('bad\tname'), /line breaks/);
});
