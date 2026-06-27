const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { Collection } = require('discord.js');
const { clearManagedTimers } = require('../src/lib/CadiaClient');
const { isTransientConnectionError } = require('../src/lib/database/mysql');
const { createBattleView } = require('../src/lib/rpg/command/views/battleView');
const { createInventoryView } = require('../src/lib/rpg/command/views/inventoryView');
const { createProfileView } = require('../src/lib/rpg/command/views/profileView');
const { createTravelView } = require('../src/lib/rpg/command/views/travelView');
const { createTutorialView } = require('../src/lib/rpg/command/views/tutorialView');
const { UserEvent: MessageUpdateEvent } = require('../src/listeners/messages/messageUpdate');
const { UserEvent: ReadyEvent } = require('../src/listeners/ready');

const root = path.resolve(__dirname, '..');

test('activity rotation replaces its timer and managed shutdown clears every timer', () => {
	const activities = [];
	const oldTimer = {};
	const client = {
		activityRotationTimer: oldTimer,
		topggStatsPoster: {},
		reminderTimer: {},
		guilds: {
			cache: new Collection([
				['one', { memberCount: 5 }],
				['two', { memberCount: 7 }]
			])
		},
		user: { setActivity: (activity) => activities.push(activity) }
	};
	const listener = Object.create(ReadyEvent.prototype);
	Object.defineProperty(listener, 'container', {
		value: { stores: { get: () => ({ size: 12 }) } }
	});

	try {
		listener._setBotActivities(client);
		assert.notEqual(client.activityRotationTimer, oldTimer);
		assert.equal(activities[0].name, '/rpg tutorial');
	} finally {
		clearManagedTimers(client);
	}
	assert.equal(client.activityRotationTimer, null);
	assert.equal(client.topggStatsPoster, null);
	assert.equal(client.reminderTimer, null);
});

test('message updates ignore partial and bot messages before emitting parsed messages', () => {
	const emitted = [];
	const listener = Object.create(MessageUpdateEvent.prototype);
	Object.defineProperty(listener, 'container', {
		value: { client: { emit: (...args) => emitted.push(args) } }
	});
	const oldMessage = { content: 'before' };
	const base = { content: 'after', webhookId: null, system: false };

	listener.run(oldMessage, { ...base, author: null });
	listener.run(oldMessage, { ...base, author: { bot: true } });
	listener.run(oldMessage, { ...base, author: { bot: false } });

	assert.deepEqual(emitted, [['preMessageParsed', { ...base, author: { bot: false } }]]);
});

test('database retry policy recognizes transient DNS and connection failures', () => {
	for (const code of ['EAI_AGAIN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT']) {
		assert.equal(isTransientConnectionError({ code }), true);
	}
	assert.equal(isTransientConnectionError({ code: 'ER_ACCESS_DENIED_ERROR' }), false);
});

test('RPG command views expose focused behavioral factories', () => {
	for (const factory of [createBattleView, createInventoryView, createProfileView, createTravelView, createTutorialView]) {
		assert.equal(typeof factory, 'function');
	}

	const tutorial = createTutorialView({
		actionButton: () => ({
			setDisabled() {
				return this;
			}
		}),
		color: { RPG: '#123456' },
		icon: { arrowRight: '>', clock: 'clock', info: 'info', objective: 'goal', success: 'ok' },
		panel: (options) => options
	});
	const firstPage = tutorial.buildTutorialPanel(0, 'tutorial');

	assert.equal(firstPage.subtitle.startsWith('1/'), true);
	assert.match(firstPage.sections.join('\n'), /Create Your Warden|RPG loop/);
});

test('Sapphire custom templates live at the configured project location', () => {
	const sapphireConfig = JSON.parse(fs.readFileSync(path.join(root, '.sapphirerc.json'), 'utf8'));
	const templateDirectory = sapphireConfig.customFileTemplates.location;

	assert.equal(templateDirectory, 'templates');
	assert.equal(fs.existsSync(path.join(root, templateDirectory, 'cmd.js.sapphire')), true);
});
