const { ApplicationCommandOptionType, MessageFlags, SlashCommandBuilder } = require('discord.js');

const schemaCache = new WeakMap();

function getCommandSchema(command) {
	if (schemaCache.has(command)) return schemaCache.get(command);
	let schema = null;
	const registry = {
		registerChatInputCommand(builderCallback) {
			if (schema) return;
			const root = new SlashCommandBuilder();
			const builder = builderCallback(root);
			schema = (builder || root).toJSON();
		},
		registerContextMenuCommand() {}
	};
	command.registerApplicationCommands?.(registry);
	schemaCache.set(command, schema || { name: command.name, description: command.description, options: [] });
	return schemaCache.get(command);
}

async function runPrefixCommand(command, message, context = {}) {
	const schema = getCommandSchema(command);
	const raw = prefixParameters(message.content, context);
	const parsed = parsePrefixOptions(schema, raw, message);
	const interaction = new PrefixInteraction(message, schema.name || command.name, parsed);
	return command.chatInputRun(interaction);
}

function prefixParameters(content, context) {
	const start = `${context.commandPrefix || ''}${context.commandName || ''}`;
	return String(content).slice(start.length).trim();
}

function parsePrefixOptions(schema, raw, message) {
	const tokens = tokenize(raw);
	let definitions = schema.options || [];
	let group = null;
	let subcommand = null;

	const groupDefinition = definitions.find(
		(option) => option.type === ApplicationCommandOptionType.SubcommandGroup && equals(option.name, tokens[0])
	);
	if (groupDefinition) {
		group = groupDefinition.name;
		tokens.shift();
		const selected = groupDefinition.options?.find(
			(option) => option.type === ApplicationCommandOptionType.Subcommand && equals(option.name, tokens[0])
		);
		if (!selected) throw new Error(`Choose a subcommand after \`${group}\`: ${subcommandNames(groupDefinition.options)}.`);
		subcommand = selected.name;
		tokens.shift();
		definitions = selected.options || [];
	} else {
		const selected = definitions.find((option) => option.type === ApplicationCommandOptionType.Subcommand && equals(option.name, tokens[0]));
		if (selected) {
			subcommand = selected.name;
			tokens.shift();
			definitions = selected.options || [];
		} else if (definitions.some((option) => option.type === ApplicationCommandOptionType.Subcommand)) {
			throw new Error(`Choose a subcommand: ${subcommandNames(definitions)}.`);
		}
	}

	const { named, positional } = splitNamedTokens(tokens, definitions);
	const values = new Map();
	let position = 0;
	let previousResolved = null;
	for (let index = 0; index < definitions.length; index += 1) {
		const definition = definitions[index];
		if (isAlternateIdOption(definition, previousResolved)) continue;
		let rawValue = named.get(definition.name);
		let fromPosition = false;
		if (rawValue === undefined && position < positional.length) {
			const remainingDefinitions = definitions.slice(index + 1).filter((entry) => entry.required);
			const consumeRest =
				definition.type === ApplicationCommandOptionType.String &&
				remainingDefinitions.length === 0 &&
				!(isIdentifierOption(definition) && definitions.length > index + 1) &&
				!definitions.slice(index + 1).some((entry) => named.has(entry.name));
			rawValue = consumeRest ? positional.slice(position).join(' ') : positional[position];
			fromPosition = true;
			if (!canDeferToAlternateId(definition, definitions[index + 1], rawValue, message)) {
				position += consumeRest ? positional.length - position : 1;
			} else {
				continue;
			}
		}
		if (rawValue === undefined) {
			if (definition.required) throw new Error(`Missing required option \`${definition.name}\`.`);
			continue;
		}
		try {
			values.set(definition.name, resolveOption(definition, rawValue, message));
			previousResolved = definition;
		} catch (error) {
			if (fromPosition && canDeferToAlternateId(definition, definitions[index + 1], rawValue, message)) continue;
			throw error;
		}
	}

	return { group, subcommand, values };
}

function isAlternateIdOption(definition, previousResolved) {
	if (!previousResolved || definition.required || definition.type !== ApplicationCommandOptionType.String) return false;
	if (previousResolved.type !== ApplicationCommandOptionType.User) return false;
	const current = normalizeOptionName(definition.name);
	const previous = normalizeOptionName(previousResolved.name);
	return current === 'id' || current === `${previous}id`;
}

function canDeferToAlternateId(definition, nextDefinition, rawValue, message) {
	if (definition.type !== ApplicationCommandOptionType.User || !nextDefinition) return false;
	if (nextDefinition.required || nextDefinition.type !== ApplicationCommandOptionType.String) return false;
	const current = normalizeOptionName(definition.name);
	const next = normalizeOptionName(nextDefinition.name);
	if (next !== 'id' && next !== `${current}id`) return false;
	const id = snowflake(rawValue);
	return /^\d{17,20}$/.test(id) && !message.mentions.users.has(id) && !message.client.users.cache.has(id);
}

function normalizeOptionName(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function isIdentifierOption(definition) {
	const name = normalizeOptionName(definition.name);
	return name === 'id' || name.endsWith('id');
}

function tokenize(input) {
	const tokens = [];
	let token = '';
	let quote = null;
	let escaped = false;
	for (const character of String(input)) {
		if (escaped) {
			token += character;
			escaped = false;
			continue;
		}
		if (character === '\\' && quote) {
			escaped = true;
			continue;
		}
		if (quote) {
			if (character === quote) quote = null;
			else token += character;
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (/\s/.test(character)) {
			if (token) {
				tokens.push(token);
				token = '';
			}
			continue;
		}
		token += character;
	}
	if (token) tokens.push(token);
	return tokens;
}

function splitNamedTokens(tokens, definitions) {
	const names = new Set(definitions.map((option) => option.name));
	const named = new Map();
	const positional = [];
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		const normalized = token.replace(/^--/, '');
		const separator = normalized.indexOf('=');
		if (separator > 0 && names.has(normalized.slice(0, separator))) {
			named.set(normalized.slice(0, separator), normalized.slice(separator + 1));
			continue;
		}
		if (token.startsWith('--') && names.has(normalized) && tokens[index + 1] !== undefined) {
			named.set(normalized, tokens[index + 1]);
			index += 1;
			continue;
		}
		positional.push(token);
	}
	return { named, positional };
}

function resolveOption(definition, rawValue, message) {
	const choice = definition.choices?.find((entry) => equals(entry.name, rawValue) || equals(entry.value, rawValue));
	const value = choice?.value ?? rawValue;
	switch (definition.type) {
		case ApplicationCommandOptionType.Integer:
			return integer(value, definition.name);
		case ApplicationCommandOptionType.Number:
			return number(value, definition.name);
		case ApplicationCommandOptionType.Boolean:
			return boolean(value, definition.name);
		case ApplicationCommandOptionType.User:
			return resolveUser(value, message);
		case ApplicationCommandOptionType.Channel:
			return resolveChannel(value, message);
		case ApplicationCommandOptionType.Role:
			return resolveRole(value, message);
		case ApplicationCommandOptionType.Mentionable:
			return resolveUser(value, message) || resolveRole(value, message);
		case ApplicationCommandOptionType.Attachment:
			return resolveAttachment(value, message);
		default:
			return String(value);
	}
}

function resolveUser(value, message) {
	const id = snowflake(value);
	const user = message.mentions.users.get(id) || message.client.users.cache.get(id);
	if (!user) throw new Error(`Could not resolve user \`${value}\`. Mention the user or provide a cached user ID.`);
	return user;
}

function resolveChannel(value, message) {
	const id = snowflake(value);
	const channel = message.mentions.channels.get(id) || message.guild.channels.cache.get(id);
	if (!channel) throw new Error(`Could not resolve channel \`${value}\`.`);
	return channel;
}

function resolveRole(value, message) {
	const id = snowflake(value);
	const role = message.mentions.roles.get(id) || message.guild.roles.cache.get(id);
	if (!role) throw new Error(`Could not resolve role \`${value}\`.`);
	return role;
}

function resolveAttachment(value, message) {
	const attachments = [...message.attachments.values()];
	const index = Number.parseInt(value, 10);
	const attachment = attachments.find((entry) => entry.id === value || entry.name === value) || attachments[index] || attachments[0];
	if (!attachment) throw new Error('Attach the required file to the prefix command message.');
	return attachment;
}

function snowflake(value) {
	return String(value).replace(/[<@!#&>]/g, '');
}

function integer(value, name) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed)) throw new Error(`Option \`${name}\` must be an integer.`);
	return parsed;
}

function number(value, name) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) throw new Error(`Option \`${name}\` must be a number.`);
	return parsed;
}

function boolean(value, name) {
	if (/^(true|yes|on|1)$/i.test(value)) return true;
	if (/^(false|no|off|0)$/i.test(value)) return false;
	throw new Error(`Option \`${name}\` must be true or false.`);
}

function equals(left, right) {
	return String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase();
}

function subcommandNames(options = []) {
	return options
		.filter((option) => option.type === ApplicationCommandOptionType.Subcommand)
		.map((option) => `\`${option.name}\``)
		.join(', ');
}

class PrefixInteraction {
	constructor(message, commandName, parsed) {
		this.message = message;
		this.client = message.client;
		this.guild = message.guild;
		this.guildId = message.guildId;
		this.channel = message.channel;
		this.channelId = message.channelId;
		this.user = message.author;
		this.member = message.member;
		this.commandName = commandName;
		this.id = message.id;
		this.createdTimestamp = message.createdTimestamp;
		this.deferred = false;
		this.replied = false;
		this.privateDeferred = false;
		this.responseMessage = null;
		this.options = new PrefixOptionResolver(parsed, message);
	}

	isChatInputCommand() {
		return true;
	}

	async deferReply(payload = {}) {
		this.deferred = true;
		this.privateDeferred = hasEphemeralFlag(payload);
		await this.channel.sendTyping().catch(() => null);
		return null;
	}

	async reply(payload) {
		const normalized = normalizePayload(payload);
		this.responseMessage = await this.message.reply(normalized);
		this.replied = true;
		return payload?.withResponse ? { resource: { message: this.responseMessage } } : this.responseMessage;
	}

	async editReply(payload) {
		const normalized = normalizePayload(payload);
		if (!this.responseMessage) {
			this.responseMessage = await this.message.reply(normalized);
			this.replied = true;
			return this.responseMessage;
		}
		this.responseMessage = await this.responseMessage.edit(normalized);
		return this.responseMessage;
	}

	async followUp(payload) {
		const normalized = normalizePayload(payload);
		return this.message.reply(normalized);
	}

	async fetchReply() {
		if (!this.responseMessage) throw new Error('This prefix command has not sent a response yet.');
		return this.responseMessage;
	}

	async deleteReply() {
		return this.responseMessage?.delete();
	}
}

class PrefixOptionResolver {
	constructor(parsed, message) {
		this.parsed = parsed;
		this.message = message;
	}

	getSubcommand(required = true) {
		if (!this.parsed.subcommand && required) throw new Error('This command requires a subcommand.');
		return this.parsed.subcommand;
	}

	getSubcommandGroup(required = false) {
		if (!this.parsed.group && required) throw new Error('This command requires a subcommand group.');
		return this.parsed.group;
	}

	getString(name, required = false) {
		return this.get(name, required);
	}

	getInteger(name, required = false) {
		return this.get(name, required);
	}

	getNumber(name, required = false) {
		return this.get(name, required);
	}

	getBoolean(name, required = false) {
		return this.get(name, required);
	}

	getUser(name, required = false) {
		return this.get(name, required);
	}

	getMember(name, required = false) {
		const user = this.get(name, required);
		return user ? this.message.guild.members.cache.get(user.id) || null : null;
	}

	getChannel(name, required = false) {
		return this.get(name, required);
	}

	getRole(name, required = false) {
		return this.get(name, required);
	}

	getMentionable(name, required = false) {
		return this.get(name, required);
	}

	getAttachment(name, required = false) {
		return this.get(name, required);
	}

	getFocused() {
		return '';
	}

	get(name, required) {
		const value = this.parsed.values.get(name) ?? null;
		if (value === null && required) throw new Error(`Missing required option \`${name}\`.`);
		return value;
	}
}

function hasEphemeralFlag(payload) {
	return Boolean(Number(payload?.flags || 0) & MessageFlags.Ephemeral);
}

function normalizePayload(payload) {
	if (typeof payload === 'string') return { content: payload };
	const normalized = { ...payload };
	delete normalized.ephemeral;
	delete normalized.withResponse;
	if (normalized.flags !== undefined) {
		const flags = Number(normalized.flags) & ~MessageFlags.Ephemeral;
		if (flags) normalized.flags = flags;
		else delete normalized.flags;
	}
	return normalized;
}

module.exports = {
	PrefixInteraction,
	getCommandSchema,
	parsePrefixOptions,
	runPrefixCommand,
	tokenize
};
