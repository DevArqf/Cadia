const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { Collection } = require('discord.js');
const { claimAuditEvent, clearAuditEventCache } = require('../src/lib/util/auditLogger');
const { UserEvent: BulkDeleteEvent } = require('../src/listeners/audit/messageDeleteBulk');

test('identical audit gateway events are emitted once inside the deduplication window', () => {
	clearAuditEventCache();
	const details = [
		{ label: 'User', value: '<@123> (123)' },
		{ label: 'Roles Added', value: '<@&456>' }
	];
	assert.equal(claimAuditEvent('guild', 'memberUpdate', 'Member Updated', details, 1_000), true);
	assert.equal(claimAuditEvent('guild', 'memberUpdate', 'Member Updated', details, 2_000), false);
	assert.equal(claimAuditEvent('guild', 'memberUpdate', 'Member Updated', details, 6_001), true);
});

test('different member updates are not collapsed by the audit guard', () => {
	clearAuditEventCache();
	assert.equal(claimAuditEvent('guild', 'memberUpdate', 'Member Updated', [{ label: 'Nickname', value: 'A -> B' }], 1_000), true);
	assert.equal(claimAuditEvent('guild', 'memberUpdate', 'Member Updated', [{ label: 'Nickname', value: 'B -> C' }], 1_001), true);
});

test('bot-only bulk deletions do not create another audit message', async () => {
	const listener = Object.create(BulkDeleteEvent.prototype);
	const messages = new Collection([
		['one', { author: { bot: true }, guild: { id: 'guild' } }],
		['two', { author: { bot: true }, guild: { id: 'guild' } }]
	]);
	await listener.run(messages);
});
