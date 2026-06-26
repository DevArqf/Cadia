const assert = require('node:assert/strict');
const test = require('node:test');
const { SlashCommandBuilder } = require('discord.js');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const { branding } = require('../src/config');
const { UserCommand: SupportCommand } = require('../src/commands/Utility/support');

test('support command registers publicly and links to the configured support server', async () => {
	let command;
	const instance = Object.create(SupportCommand.prototype);
	instance.description = 'Join the official Cadia support server';
	instance.registerApplicationCommands({
		registerChatInputCommand(callback) {
			command = callback(new SlashCommandBuilder()).toJSON();
		}
	});

	let reply;
	await SupportCommand.prototype.chatInputRun.call(
		{},
		{
			reply: async (payload) => {
				reply = payload;
			}
		}
	);

	const serialized = JSON.stringify(reply);
	assert.equal(command.name, 'support');
	assert.match(serialized, /Join Cadia Support/);
	assert.match(serialized, new RegExp(escapeRegExp(branding.supportServerUrl)));
	assert.equal(Boolean(reply.flags), true);
});

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
