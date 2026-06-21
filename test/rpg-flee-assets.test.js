const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { fleeResultImage } = require('../src/lib/rpg/assets');
const { buildBattleResultReply } = require('../src/commands/Systems/RPG System/rpg');

const expectedImages = {
	'broken-gate': 'the-broken-gate-flee.png',
	'ashwood-outskirts': 'ashwood-outskirts-flee.png',
	'glassmine-depths': 'glassmine-depths-flee.png'
};

test('each RPG region provides its own flee image', () => {
	for (const [regionId, fileName] of Object.entries(expectedImages)) {
		const image = fleeResultImage(regionId);
		assert.equal(image.url, `attachment://${fileName}`);
		assert.equal(image.attachment.name, fileName);
		assert.ok(image.attachment.attachment.length > 1_000_000);
	}
});

test('escaped battle results attach the flee image for the Warden region', () => {
	for (const [regionId, fileName] of Object.entries(expectedImages)) {
		const reply = buildBattleResultReply(
			{
				escaped: true,
				won: false,
				profile: { name: 'Aster', region: regionId, hp: 400, maxHp: 850 },
				encounter: { id: 'rust-hound', name: 'Rust Hound' }
			},
			'flee'
		);

		assert.equal(reply.files[0].name, fileName);
		assert.match(JSON.stringify(reply.components), new RegExp(`attachment://${fileName.replaceAll('.', '\\.')}`));
	}
});
