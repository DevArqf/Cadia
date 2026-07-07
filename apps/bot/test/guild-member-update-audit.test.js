const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { collectMemberChanges } = require('../src/listeners/audit/guildMemberUpdate');

function member({ avatar = 'old', roles = ['guild'], partial = false } = {}) {
	return {
		id: 'user', nickname: null, avatar: null, partial,
		user: { avatar, displayAvatarURL: () => `https://cdn.discordapp.com/avatars/user/${avatar}.png` },
		roles: { cache: new Map(roles.map((id) => [id, { id }])) }
	};
}

test('avatar updates show the new avatar without false role additions', () => {
	const result = collectMemberChanges(member({ avatar: 'old', roles: ['guild'] }), member({ avatar: 'new', roles: ['guild', 'member', 'developer'] }));
	assert.equal(result.avatarChanged, true);
	assert.match(result.changes[0].value, /new\.png/);
	assert.equal(result.changes.some((change) => change.label === 'Roles Added'), false);
});

test('real role-only updates still report added and removed roles', () => {
	const result = collectMemberChanges(member({ roles: ['guild', 'old-role'] }), member({ roles: ['guild', 'new-role'] }));
	assert.deepEqual(result.changes.map((change) => change.label), ['Roles Added', 'Roles Removed']);
});
