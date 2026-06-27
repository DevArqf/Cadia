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
	assert.match(branding.userAgent, new RegExp(`v${require('../package.json').version.replaceAll('.', '\\.')}$`));
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

test('command mentions use branding command IDs with safe fallback', () => {
	const { branding } = require('../src/config/branding');
	const { clearRuntimeCommandIds, commandMention } = require('../src/lib/util/commandMentions');

	clearRuntimeCommandIds();

	assert.equal(commandMention('rpg tutorial'), `</rpg tutorial:${branding.rpgCommandId}>`);
	assert.equal(commandMention('rpg admin analytics'), `</rpg admin analytics:${branding.rpgCommandId}>`);
	assert.equal(commandMention('rpg boss-info'), `</rpg bestiary:${branding.rpgCommandId}>`);
	assert.equal(commandMention('/help'), `</help:${branding.helpCommandId}>`);
	assert.equal(commandMention('bug-report'), `</bug-report:${branding.bugReportCommandId}>`);
	assert.equal(commandMention('bugreport'), `</bug-report:${branding.bugReportCommandId}>`);
	assert.equal(commandMention('8ball'), `</8ball:${branding.eightballCommandId}>`);
	assert.equal(commandMention('top-gg'), `</top-gg:${branding.topggvotecheckCommandId}>`);
	assert.equal(commandMention('missing-command'), '/missing-command');
});

test('command mentions prefer live Discord command IDs loaded at startup', async () => {
	const { clearRuntimeCommandIds, commandMention, refreshCommandMentionIds, setRuntimeCommandIds } = require('../src/lib/util/commandMentions');
	const client = {
		application: {
			commands: {
				fetch: async () =>
					new Map([
						['rpg', { name: 'rpg', id: '200000000000000001' }],
						['bug-report', { name: 'bug-report', id: '200000000000000002' }]
					])
			}
		}
	};

	await refreshCommandMentionIds(client, null);

	assert.equal(commandMention('rpg tutorial'), '</rpg tutorial:200000000000000001>');
	assert.equal(commandMention('bugreport'), '</bug-report:200000000000000002>');

	setRuntimeCommandIds([{ name: 'help', id: '200000000000000003' }]);
	assert.equal(commandMention('help'), '</help:200000000000000003>');
	clearRuntimeCommandIds();
});
