const assert = require('node:assert/strict');
const test = require('node:test');
const { createIpcClient, createIpcServer } = require('@cadia/ipc');

test('jszmq IPC client receives async replies from server handler', async () => {
	const endpoint = `ws://127.0.0.1:${39000 + (process.pid % 1000)}/cadia-ipc-test`;
	const server = createIpcServer({
		endpoint,
		handler: async (request) => ({
			type: request.type,
			answer: request.payload.value + 1
		})
	});
	const client = createIpcClient({ endpoint, timeoutMs: 2_000 });

	try {
		const response = await client.request('test.increment', { value: 41 });
		assert.deepEqual(response, { type: 'test.increment', answer: 42 });
	} finally {
		server.close();
	}
});
