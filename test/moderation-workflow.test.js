const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits } = require('discord.js');
const {
	runModerationAction,
	sendDmNotice,
	validateModerationTarget
} = require('../src/lib/moderation/workflow');
const { isMentionDeleteInteraction } = require('../src/listeners/botMention');

test('moderation rejects a moderator without the required permission', async () => {
	const interaction = createInteraction({ actorHasPermission: false });
	const valid = await validateModerationTarget({
		interaction,
		targetMember: createTarget(),
		action: 'kick',
		permission: PermissionFlagsBits.KickMembers,
		capability: 'kickable'
	});

	assert.equal(valid, false);
	assert.equal(interaction.replies.length, 1);
	assert.match(interaction.replies[0].content, /do not have permission/i);
});

test('moderation rejects an action when the bot lacks the required permission', async () => {
	const interaction = createInteraction({ botHasPermission: false });
	const valid = await validateModerationTarget({
		interaction,
		targetMember: createTarget(),
		action: 'ban',
		permission: PermissionFlagsBits.BanMembers,
		capability: 'bannable'
	});

	assert.equal(valid, false);
	assert.match(interaction.replies[0].content, /Cadia does not have permission/i);
});

test('moderation rejects equal or higher role hierarchy', async () => {
	const interaction = createInteraction({ roleComparison: 0 });
	const valid = await validateModerationTarget({
		interaction,
		targetMember: createTarget(),
		action: 'mute',
		permission: PermissionFlagsBits.ModerateMembers,
		capability: 'moderatable'
	});

	assert.equal(valid, false);
	assert.match(interaction.replies[0].content, /equal or higher role/i);
});

test('moderation rejects a missing guild member when the action requires one', async () => {
	const interaction = createInteraction();
	const valid = await validateModerationTarget({
		interaction,
		targetMember: null,
		action: 'kick',
		permission: PermissionFlagsBits.KickMembers,
		capability: 'kickable'
	});

	assert.equal(valid, false);
	assert.match(interaction.replies[0].content, /no longer in this server/i);
});

test('DM failures are logged and do not abort moderation', async () => {
	const warnings = [];
	const delivered = await sendDmNotice({
		user: {
			tag: 'target',
			send: async () => {
				throw new Error('DMs disabled');
			}
		},
		payload: { content: 'notice' },
		logger: { warn: (message) => warnings.push(message) },
		action: 'kick'
	});

	assert.equal(delivered, false);
	assert.match(warnings[0], /DMs disabled/);
});

test('moderation acknowledges before the action and edits the deferred response', async () => {
	const calls = [];
	const interaction = {
		deferred: false,
		replied: false,
		deferReply: async () => {
			calls.push('defer');
			interaction.deferred = true;
		},
		editReply: async (payload) => {
			calls.push('edit');
			return payload;
		}
	};

	await runModerationAction({
		interaction,
		logger: { error: assert.fail },
		errorMessage: 'failed',
		action: async () => calls.push('action'),
		success: { content: 'done' }
	});

	assert.deepEqual(calls, ['defer', 'action', 'edit']);
});

test('mention delete button belongs only to the requesting author', () => {
	const interaction = {
		customId: 'deleteMentionReply',
		message: { id: 'reply' },
		user: { id: 'author' },
		isButton: () => true
	};

	assert.equal(isMentionDeleteInteraction(interaction, 'reply', 'author'), true);
	assert.equal(isMentionDeleteInteraction({ ...interaction, user: { id: 'other' } }, 'reply', 'author'), false);
});

function createInteraction({ actorHasPermission = true, botHasPermission = true, roleComparison = 1 } = {}) {
	const replies = [];
	return {
		deferred: false,
		replied: false,
		replies,
		user: { id: 'actor' },
		member: {
			permissions: { has: () => actorHasPermission },
			roles: { highest: { comparePositionTo: () => roleComparison } }
		},
		guild: {
			ownerId: 'owner',
			members: { me: { permissions: { has: () => botHasPermission } } }
		},
		reply: async (payload) => {
			replies.push(payload);
			return payload;
		},
		editReply: async (payload) => {
			replies.push(payload);
			return payload;
		}
	};
}

function createTarget() {
	return {
		id: 'target',
		kickable: true,
		moderatable: true,
		permissions: { has: () => false },
		roles: { highest: {} }
	};
}
