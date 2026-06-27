const assert = require('node:assert/strict');
const test = require('node:test');

const { configuredUserIds, isDeveloper } = require('../src/lib/util/authorization');

test('developer authorization accepts whitespace-separated IDs without empty entries', () => {
	const configured = 'first second\nthird\tfourth';

	assert.deepEqual(configuredUserIds(configured), ['first', 'second', 'third', 'fourth']);
	assert.equal(isDeveloper('third', configured), true);
	assert.equal(isDeveloper('missing', configured), false);
});
