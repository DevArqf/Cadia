const assert = require('node:assert/strict');
const test = require('node:test');

const {
	MESSAGE_XP_COOLDOWN_MS,
	CooldownTracker,
	calculateMessageXp,
	hasImageAttachment
} = require('../src/lib/util/leveling');

test('message XP increases with useful text length and remains capped', () => {
	assert.equal(calculateMessageXp({ content: 'A short message' }), 1);
	assert.equal(calculateMessageXp({ content: 'a'.repeat(100) }), 2);
	assert.equal(calculateMessageXp({ content: 'a'.repeat(200) }), 3);
	assert.equal(calculateMessageXp({ content: 'a'.repeat(300) }), 4);
	assert.equal(calculateMessageXp({ content: 'a'.repeat(10_000) }), 4);
});

test('an image adds XP once even when a message contains multiple images', () => {
	const attachments = new Map([
		['one', { contentType: 'image/png', name: 'one.png' }],
		['two', { contentType: 'image/jpeg', name: 'two.jpg' }]
	]);

	assert.equal(hasImageAttachment(attachments), true);
	assert.equal(calculateMessageXp({ content: '', attachments }), 3);
	assert.equal(calculateMessageXp({ content: 'a'.repeat(10_000), attachments }), 6);
});

test('image detection falls back to common file extensions when content type is absent', () => {
	assert.equal(hasImageAttachment(new Map([['image', { name: 'photo.webp' }]])), true);
	assert.equal(hasImageAttachment(new Map([['file', { name: 'notes.txt' }]])), false);
});

test('message XP cooldown is scoped by key and expires after 90 seconds', () => {
	const cooldowns = new CooldownTracker(MESSAGE_XP_COOLDOWN_MS);
	const startedAt = 1_000;

	assert.equal(cooldowns.tryAcquire('guild-a:user-a', startedAt), true);
	assert.equal(cooldowns.tryAcquire('guild-a:user-a', startedAt + MESSAGE_XP_COOLDOWN_MS - 1), false);
	assert.equal(cooldowns.tryAcquire('guild-a:user-b', startedAt + 1), true);
	assert.equal(cooldowns.tryAcquire('guild-b:user-a', startedAt + 1), true);
	assert.equal(cooldowns.tryAcquire('guild-a:user-a', startedAt + MESSAGE_XP_COOLDOWN_MS), true);
});

test('a failed XP operation can release its cooldown claim', () => {
	const cooldowns = new CooldownTracker(MESSAGE_XP_COOLDOWN_MS);
	assert.equal(cooldowns.tryAcquire('guild:user', 1_000), true);
	cooldowns.release('guild:user');
	assert.equal(cooldowns.tryAcquire('guild:user', 1_001), true);
});
