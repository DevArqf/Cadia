const assert = require('node:assert/strict');
const test = require('node:test');
const { AsyncEventEmitter } = require('@vladfrangu/async_event_emitter');
const { SHARD_MAX_LISTENERS, configureShardListenerCapacity } = require('../src/lib/gateway/CadiaShardingStrategy');

test('Cadia raises listener capacity only on internal WebSocket shards', () => {
	const shards = [new AsyncEventEmitter(), new AsyncEventEmitter()];

	configureShardListenerCapacity(shards);

	assert.equal(shards[0].getMaxListeners(), SHARD_MAX_LISTENERS);
	assert.equal(shards[1].getMaxListeners(), SHARD_MAX_LISTENERS);
});
