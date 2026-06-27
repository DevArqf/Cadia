const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ApplicationCommandOptionType, Collection, MessageFlags } = require('discord.js');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { ClientConfig } = require('../src/config');
const { getCommandSchema, parsePrefixOptions, runPrefixCommand, tokenize } = require('../src/lib/commands/prefixAdapter');
const { findClosestCommand } = require('../src/listeners/commands/unknownMessageCommand');
const { UserEvent: PrefixOnlyEvent } = require('../src/listeners/commands/unknownMessageCommandName');
const CadiaCommand = require('../src/lib/structures/commands/CadiaCommand');
const { branding } = require('../src/config');

test('Cadia enables cd prefix commands for every Cadia command', () => {
	assert.equal(ClientConfig.defaultPrefix, 'cd ');
	assert.equal(typeof CadiaCommand.prototype.messageRun, 'function');
	assert.equal(branding.version, '6.8.5');
});

test('every command module exposes a slash schema reusable by the prefix adapter', () => {
	const commandFiles = findCommandFiles(path.resolve(__dirname, '..', 'src', 'commands'));
	assert.ok(commandFiles.length > 0, 'No command files were found under src/commands');

	for (const file of commandFiles) {
		const CommandClass = require(file).UserCommand;
		assert.equal(typeof CommandClass, 'function', `${file} must export UserCommand`);
		const command = Object.create(CommandClass.prototype);
		command.name = path.basename(file, '.js');
		command.description = 'Prefix schema test';
		const schema = getCommandSchema(command);
		assert.ok(schema.name, `${file} must register a chat input command`);
		assert.equal(typeof command.messageRun, 'function', `${file} must inherit prefix support`);
	}
});

test('prefix tokenizer preserves quoted values', () => {
	assert.deepEqual(tokenize('create "Aster Vale" warden gateborn'), ['create', 'Aster Vale', 'warden', 'gateborn']);
});

test('prefix parser supports subcommands, positional values, and named options', () => {
	const schema = {
		name: 'rpg',
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: 'create',
				options: [
					{ type: ApplicationCommandOptionType.String, name: 'name', required: true },
					{
						type: ApplicationCommandOptionType.String,
						name: 'class',
						required: true,
						choices: [{ name: 'Warden', value: 'warden' }]
					},
					{ type: ApplicationCommandOptionType.String, name: 'origin', required: true }
				]
			}
		]
	};
	const parsed = parsePrefixOptions(schema, 'create name="Aster Vale" class=Warden origin=gateborn', fakeMessage());

	assert.equal(parsed.subcommand, 'create');
	assert.equal(parsed.values.get('name'), 'Aster Vale');
	assert.equal(parsed.values.get('class'), 'warden');
	assert.equal(parsed.values.get('origin'), 'gateborn');
});

test('prefix parser resolves Discord users, channels, roles, booleans, and integers', () => {
	const user = { id: '12345678901234567' };
	const channel = { id: '22345678901234567' };
	const role = { id: '32345678901234567' };
	const message = fakeMessage({ user, channel, role });
	const schema = {
		name: 'test',
		options: [
			{ type: ApplicationCommandOptionType.User, name: 'user', required: true },
			{ type: ApplicationCommandOptionType.Channel, name: 'channel', required: true },
			{ type: ApplicationCommandOptionType.Role, name: 'role', required: true },
			{ type: ApplicationCommandOptionType.Boolean, name: 'enabled', required: true },
			{ type: ApplicationCommandOptionType.Integer, name: 'amount', required: true }
		]
	};
	const parsed = parsePrefixOptions(schema, '<@12345678901234567> <#22345678901234567> <@&32345678901234567> yes 25', message);

	assert.equal(parsed.values.get('user'), user);
	assert.equal(parsed.values.get('channel'), channel);
	assert.equal(parsed.values.get('role'), role);
	assert.equal(parsed.values.get('enabled'), true);
	assert.equal(parsed.values.get('amount'), 25);
});

test('prefix parser accepts a natural multi-word moderation reason without reason=', () => {
	const user = { id: '12345678901234567' };
	const schema = {
		name: 'ban',
		options: [
			{ type: ApplicationCommandOptionType.User, name: 'user', required: false },
			{ type: ApplicationCommandOptionType.String, name: 'userid', required: false },
			{ type: ApplicationCommandOptionType.String, name: 'reason', required: false },
			{ type: ApplicationCommandOptionType.Attachment, name: 'evidence', required: false }
		]
	};
	const parsed = parsePrefixOptions(schema, '<@12345678901234567> Breaking Rules', fakeMessage({ user }));

	assert.equal(parsed.values.get('user'), user);
	assert.equal(parsed.values.has('userid'), false);
	assert.equal(parsed.values.get('reason'), 'Breaking Rules');
});

test('prefix parser routes an uncached numeric user ID into the alternate ID option', () => {
	const schema = {
		name: 'ban',
		options: [
			{ type: ApplicationCommandOptionType.User, name: 'user', required: false },
			{ type: ApplicationCommandOptionType.String, name: 'userid', required: false },
			{ type: ApplicationCommandOptionType.String, name: 'reason', required: false }
		]
	};
	const parsed = parsePrefixOptions(schema, '12345678901234567 Breaking Rules', fakeMessage());

	assert.equal(parsed.values.has('user'), false);
	assert.equal(parsed.values.get('userid'), '12345678901234567');
	assert.equal(parsed.values.get('reason'), 'Breaking Rules');
});

test('unknown prefix commands suggest the closest available command', () => {
	const commands = [
		{ name: 'ping', aliases: [] },
		{ name: 'profile', aliases: [] },
		{ name: 'leaderboard', aliases: ['lb'] }
	];

	assert.equal(findClosestCommand('pnig', commands), 'ping');
	assert.equal(findClosestCommand('leaderbord', commands), 'leaderboard');
	assert.equal(findClosestCommand('completely-different', commands), null);
});

test('typing only cd asks whether the user needs help', async () => {
	let reply = null;
	const listener = Object.create(PrefixOnlyEvent.prototype);

	await listener.run({
		commandPrefix: 'cd ',
		message: {
			reply: async (payload) => {
				reply = payload;
			}
		}
	});

	assert.match(reply, /Need help using Cadia/);
	assert.match(reply, /cd help/);
	assert.match(reply, /cd rpg tutorial/);
});

test('prefix command ephemeral replies stay in-channel as message replies', async () => {
	const replies = [];
	let dmAttempts = 0;
	const command = {
		name: 'private-test',
		registerApplicationCommands(registry) {
			registry.registerChatInputCommand((builder) => builder.setName('private-test').setDescription('Private prefix test'));
		},
		async chatInputRun(interaction) {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			await interaction.editReply({ content: 'private response', flags: MessageFlags.Ephemeral });
			await interaction.followUp({ content: 'private follow-up', flags: MessageFlags.Ephemeral });
		}
	};
	const message = fakeMessage();
	message.content = 'cd private-test';
	message.reply = async (payload) => {
		replies.push(payload);
		return {
			payload,
			edit: async (nextPayload) => {
				replies.push(nextPayload);
				return { payload: nextPayload, edit: async () => null };
			}
		};
	};
	message.author.send = async () => {
		dmAttempts += 1;
		throw new Error('DM should not be used for prefix replies.');
	};

	await runPrefixCommand(command, message, { commandPrefix: 'cd ', commandName: 'private-test' });

	assert.equal(dmAttempts, 0);
	assert.equal(replies.length, 2);
	assert.deepEqual(replies.map((payload) => payload.content), ['private response', 'private follow-up']);
});

function fakeMessage({ user, channel, role } = {}) {
	const users = new Collection(user ? [[user.id, user]] : []);
	const channels = new Collection(channel ? [[channel.id, channel]] : []);
	const roles = new Collection(role ? [[role.id, role]] : []);
	return {
		attachments: new Collection(),
		author: { id: 'author', send: async () => null },
		channel: { sendTyping: async () => null },
		client: { users: { cache: users } },
		guild: {
			channels: { cache: channels },
			roles: { cache: roles }
		},
		mentions: { users, channels, roles }
	};
}

function findCommandFiles(directory) {
	const files = [];
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...findCommandFiles(fullPath));
		else if (entry.name.endsWith('.js')) files.push(fullPath);
	}
	return files;
}
