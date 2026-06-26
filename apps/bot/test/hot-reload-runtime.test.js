const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const {
	clearInteractionHandlers,
	hasRestartSafeFallback,
	registerInteractionHandler,
	routeComponentInteraction
} = require('../src/lib/runtime/interactionRouter');
const { clearRuntimeConfigCache, getRuntimeConfig } = require('../src/lib/runtime/runtimeConfig');
const { RuntimeConfigPrecondition } = require('../src/preconditions/global/RuntimeConfig');

test('global interaction router dispatches restart-safe custom IDs', async () => {
	clearInteractionHandlers();
	const calls = [];
	registerInteractionHandler('help', async (interaction) => calls.push(interaction.customId));

	const handled = await routeComponentInteraction({
		customId: 'help:user:category',
		isButton: () => false,
		isStringSelectMenu: () => true
	});

	assert.equal(handled, true);
	assert.deepEqual(calls, ['help:user:category']);
	clearInteractionHandlers();
});

test('collector-only Cadia component prefixes receive restart fallback handling', () => {
	assert.equal(hasRestartSafeFallback('rpg-inventory:old-interaction:next'), true);
	assert.equal(hasRestartSafeFallback('calculator:old-interaction:1'), true);
	assert.equal(hasRestartSafeFallback('poll:old-interaction:0'), true);
	assert.equal(hasRestartSafeFallback('bug:old-interaction:solve'), true);
	assert.equal(hasRestartSafeFallback('ticket:open'), false);
});

test('runtime config reads JSON defaults without requiring restart-only constants', async () => {
	clearRuntimeConfigCache();

	assert.equal(await getRuntimeConfig('maintenance.enabled'), false);
	assert.equal(await getRuntimeConfig('rpg.xpMultiplier'), 1);
	assert.equal(await getRuntimeConfig('missing.key', 'fallback'), 'fallback');
});

test('runtime config precondition supports maintenance and disabled commands', async () => {
	const precondition = Object.create(RuntimeConfigPrecondition.prototype);
	precondition.ok = () => ({ ok: true });
	precondition.error = (payload) => ({ ok: false, ...payload });
	const runtime = require('../src/lib/runtime/runtimeConfig');
	const originalGetRuntimeConfig = runtime.getRuntimeConfig;
	const values = new Map([
		['maintenance.enabled', false],
		['commands.disabled', ['ping']]
	]);

	runtime.getRuntimeConfig = async (key, fallback) => (values.has(key) ? values.get(key) : fallback);
	try {
		assert.equal((await precondition.check('help', 'user')).ok, true);
		assert.equal((await precondition.check('ping', 'user')).identifier, 'CommandDisabled');

		values.set('maintenance.enabled', true);
		assert.equal((await precondition.check('help', 'user')).identifier, 'MaintenanceMode');
	} finally {
		runtime.getRuntimeConfig = originalGetRuntimeConfig;
	}
});
