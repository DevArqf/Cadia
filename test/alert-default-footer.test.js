const assert = require('node:assert/strict');
const test = require('node:test');
const { Collection } = require('discord.js');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { DEFAULT_ALERT_FOOTER, readDraft, resolveDraftVariables } = require('../src/lib/util/alertCommandUtils');

test('alerts use the Cadia RPG era footer with the current total user count', () => {
	const interaction = {
		options: {
			getString: (name) => (name === 'message' ? 'Release message' : null)
		}
	};
	const client = {
		guilds: {
			cache: new Collection([
				['one', { memberCount: 20_000 }],
				['two', { memberCount: 16_412 }]
			])
		},
		user: { displayAvatarURL: () => 'https://example.com/cadia.png' }
	};

	const draft = resolveDraftVariables(readDraft(interaction), client);

	assert.match(DEFAULT_ALERT_FOOTER, /\[TOTAL USERS\]/);
	assert.equal(draft.footer, 'Thank you to all **36,412** Cadia users. This is the foundation for the next era of Cadia RPG.');
});

test('a custom alert footer overrides the default footer', () => {
	const interaction = {
		options: {
			getString: (name) => ({ message: 'Release message', footer: 'Custom footer' })[name] ?? null
		}
	};

	assert.equal(readDraft(interaction).footer, 'Custom footer');
});
