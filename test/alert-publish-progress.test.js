const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { estimateRemainingSeconds, publishEtaText, sendUserDms, startPublishProgressUpdates } = require('../src/lib/util/alertCommandUtils');

test('global alert ETA uses observed broadcast throughput', () => {
	const originalNow = Date.now;
	Date.now = () => 70_000;
	try {
		const progress = { processed: 20, startedAt: 10_000 };
		assert.equal(estimateRemainingSeconds(100, progress), 240);
		assert.match(publishEtaText(100, true, progress), /4 minutes/);
	} finally {
		Date.now = originalNow;
	}
});

test('global alert publishing status refreshes repeatedly and stops cleanly', async () => {
	const edits = [];
	const interaction = {
		editReply: async (payload) => {
			edits.push(JSON.stringify(payload));
		}
	};
	const updater = startPublishProgressUpdates({
		interaction,
		draft: { message: 'Alert', style: 'update', title: 'Update' },
		dmUsers: true,
		targetData: { userIds: new Set(['one', 'two']), sources: {} },
		intervalMs: 10
	});

	updater.update({ failed: 0, processed: 1, remaining: 1, sent: 1, startedAt: Date.now() - 1_000, total: 2 });
	await updater.refresh();
	await new Promise((resolve) => setTimeout(resolve, 25));
	await updater.stop();
	const editCountAfterStop = edits.length;
	await new Promise((resolve) => setTimeout(resolve, 20));

	assert.ok(edits.length >= 2);
	assert.equal(edits.length, editCountAfterStop);
	assert.match(edits.at(-1), /1\/2 processed/);
});

test('DM broadcast reports progress after each attempted recipient', async () => {
	const progress = [];
	const users = new Map([
		['one', { bot: false, send: async () => {} }],
		['two', { bot: false, send: async () => Promise.reject(new Error('closed DMs')) }]
	]);
	const client = { users: { fetch: async (id) => users.get(id) } };
	const stats = await sendUserDms(
		client,
		{ message: 'Alert', style: 'update' },
		{ userIds: new Set(users.keys()), sources: {} },
		{ onProgress: (state) => progress.push(state) }
	);

	assert.equal(stats.sent, 1);
	assert.equal(stats.failed, 1);
	assert.deepEqual(
		progress.map((state) => state.processed),
		[0, 1, 2]
	);
});
