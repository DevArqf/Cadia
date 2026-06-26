const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { UserCommand: InviteCommand } = require('../src/commands/Utility/invite');
const { getAllFeaturesOAuthUrl, invitePermissionPresets } = require('../src/config/invite');

test('invite command exposes only least-privilege permission presets', () => {
	let command;
	const instance = Object.create(InviteCommand.prototype);
	instance.description = 'Invite Cadia';
	instance.registerApplicationCommands({
		registerChatInputCommand(callback) {
			command = callback(new SlashCommandBuilder()).toJSON();
		}
	});

	const choices = command.options.find((option) => option.name === 'permissions').choices;
	assert.deepEqual(
		choices.map((choice) => choice.value),
		invitePermissionPresets.map((preset) => preset.value)
	);
	assert.equal(
		choices.some((choice) => BigInt(choice.value) & PermissionFlagsBits.Administrator),
		false
	);
});

test('invite command generates the selected preset without Administrator', async () => {
	delete process.env.CADIA_ALL_FEATURES_OAUTH_URL;
	const selected = invitePermissionPresets.at(-1);
	let generated;
	let reply;
	const interaction = {
		options: { getString: () => selected.value },
		client: {
			generateInvite: (options) => {
				generated = options;
				return 'https://discord.com/oauth2/authorize';
			}
		},
		reply: async (payload) => {
			reply = payload;
		}
	};

	await InviteCommand.prototype.chatInputRun.call({}, interaction);

	assert.equal(BigInt(generated.permissions[0]) & PermissionFlagsBits.Administrator, 0n);
	assert.equal(reply.flags !== undefined, true);
});

test('invite command uses configured OAuth URL for all features preset', async () => {
	const selected = invitePermissionPresets.find((preset) => preset.id === 'all-features');
	process.env.CADIA_ALL_FEATURES_OAUTH_URL = 'https://discord.com/oauth2/authorize?client_id=123456789012345678&scope=bot%20applications.commands';
	let generated = false;
	let reply;
	const interaction = {
		options: { getString: () => selected.value },
		client: {
			generateInvite: () => {
				generated = true;
				return 'https://discord.com/oauth2/authorize?client_id=generated';
			}
		},
		reply: async (payload) => {
			reply = payload;
		}
	};

	await InviteCommand.prototype.chatInputRun.call({}, interaction);

	assert.equal(generated, false);
	assert.match(JSON.stringify(reply), /client_id=123456789012345678/);
	delete process.env.CADIA_ALL_FEATURES_OAUTH_URL;
});

test('configured all-features OAuth URL is repaired with Cadia application id', () => {
	process.env.CADIA_ALL_FEATURES_OAUTH_URL = 'https://discord.com/oauth2/authorize?permissions=280125485303';

	const url = new URL(getAllFeaturesOAuthUrl());

	assert.equal(url.searchParams.get('client_id'), '1200475110235197631');
	assert.equal(url.searchParams.get('scope'), 'bot applications.commands');
	delete process.env.CADIA_ALL_FEATURES_OAUTH_URL;
});

test('configured all-features OAuth URL replaces placeholder client id', () => {
	process.env.CADIA_ALL_FEATURES_OAUTH_URL =
		'https://discord.com/oauth2/authorize?client_id=your_bot_application_id&permissions=280125485303&scope=bot%20applications.commands';

	const url = new URL(getAllFeaturesOAuthUrl());

	assert.equal(url.searchParams.get('client_id'), '1200475110235197631');
	assert.equal(url.searchParams.get('permissions'), '280125485303');
	delete process.env.CADIA_ALL_FEATURES_OAUTH_URL;
});
