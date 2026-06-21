const assert = require('node:assert/strict');
const test = require('node:test');
const { Collection, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { runModerationAction, sendDmNotice, validateModerationTarget } = require('../src/lib/moderation/workflow');
const { isMentionDeleteInteraction } = require('../src/listeners/botMention');
const { UserCommand: PurgeCommand } = require('../src/commands/Moderation/purge');
const { UserCommand: UnbanCommand } = require('../src/commands/Moderation/unban');
const { UserCommand: KickCommand } = require('../src/commands/Moderation/kick');

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

test('unban validates Discord IDs and acknowledges before removing a ban', async () => {
	const calls = [];
	const invalid = createModerationCommandInteraction({ userId: 'not-an-id', calls });
	await UnbanCommand.prototype.chatInputRun.call(commandContext(), invalid);
	assert.match(invalid.replies[0].content, /valid Discord user ID/i);

	const interaction = createModerationCommandInteraction({ userId: '123456789012345678', calls });
	await UnbanCommand.prototype.chatInputRun.call(commandContext(), interaction);
	assert.deepEqual(calls, ['defer', 'unban:123456789012345678', 'edit']);
});

test('purge fetches once, filters messages, and edits its private acknowledgement', async () => {
	const calls = [];
	const messages = new Collection([
		['one', { content: 'https://example.com', author: { bot: false }, attachments: new Collection() }],
		['two', { content: 'plain text', author: { bot: false }, attachments: new Collection() }]
	]);
	const interaction = createModerationCommandInteraction({ amount: 20, filter: 'links', calls });
	interaction.channel = {
		messages: {
			fetch: async ({ limit }) => {
				calls.push(`fetch:${limit}`);
				return messages;
			}
		},
		bulkDelete: async (selected, skipOld) => {
			calls.push(`delete:${selected.size}:${skipOld}`);
		}
	};

	await PurgeCommand.prototype.chatInputRun.call(commandContext(), interaction);

	assert.deepEqual(calls, ['defer-private', 'fetch:20', 'delete:1:true', 'edit']);
	assert.match(interaction.replies.at(-1).embeds[0].data.description, /purged \*\*1\*\*/i);
});

test('kick sends one notice, performs one moderation action, and edits the deferred response', async () => {
	const calls = [];
	const target = {
		id: 'target',
		tag: 'target#0001',
		toString: () => '<@target>',
		send: async () => calls.push('dm')
	};
	const member = {
		...createTarget(),
		id: target.id,
		user: target,
		kick: async () => calls.push('kick')
	};
	const interaction = createModerationCommandInteraction({ calls });
	interaction.options = {
		getUser: () => target,
		getString: () => 'reason'
	};
	interaction.guild.name = 'Guild';
	interaction.guild.members.fetch = async () => member;

	await KickCommand.prototype.chatInputRun.call(commandContext(), interaction);

	assert.deepEqual(calls, ['defer', 'dm', 'kick', 'edit']);
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

function commandContext() {
	return { container: { logger: { error: assert.fail, warn: () => null } } };
}

function createModerationCommandInteraction({ userId, amount, filter, calls }) {
	const replies = [];
	const interaction = {
		deferred: false,
		replied: false,
		replies,
		user: { id: 'actor', tag: 'actor#0001', toString: () => '<@actor>' },
		member: {
			permissions: { has: () => true },
			roles: { highest: { comparePositionTo: () => 1 } }
		},
		guild: {
			ownerId: 'owner',
			members: { me: { permissions: { has: () => true } } },
			bans: {
				remove: async (id) => {
					calls.push(`unban:${id}`);
				}
			}
		},
		client: { users: { fetch: async () => ({ tag: 'target#0001' }) } },
		options: {
			getString: (name) => ({ user: userId, reason: null, filter })[name] ?? null,
			getInteger: () => amount
		},
		deferReply: async (options) => {
			calls.push(options?.flags === MessageFlags.Ephemeral ? 'defer-private' : 'defer');
			interaction.deferred = true;
		},
		reply: async (payload) => {
			replies.push(payload);
			return payload;
		},
		editReply: async (payload) => {
			calls.push('edit');
			replies.push(payload);
			return payload;
		}
	};
	return interaction;
}
