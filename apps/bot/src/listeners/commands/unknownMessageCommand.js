const { Events, Listener } = require('@sapphire/framework');
const { emojis } = require('../../config');

class UserEvent extends Listener {
	constructor(context, options) {
		super(context, { ...options, event: Events.UnknownMessageCommand });
	}

	async run({ message, commandName }) {
		const commands = [...this.container.stores.get('commands').values()];
		const suggestion = findClosestCommand(commandName, commands);
		if (!suggestion) {
			return message.reply(`${emojis.custom.warning} Unknown command \`cd ${commandName}\`. Run \`cd help\` to browse commands.`);
		}
		return message.reply(`${emojis.custom.question} Unknown command \`cd ${commandName}\`. Did you mean \`cd ${suggestion}\`?`);
	}
}

function findClosestCommand(input, commands) {
	const typed = normalize(input);
	if (!typed) return null;
	const names = new Set();
	for (const command of commands) {
		names.add(command.name);
		for (const alias of command.aliases || []) names.add(alias);
	}
	let closest = null;
	for (const name of names) {
		const normalized = normalize(name);
		const distance = levenshtein(typed, normalized);
		if (!closest || distance < closest.distance) closest = { name, distance, length: normalized.length };
	}
	if (!closest) return null;
	const threshold = Math.max(1, Math.min(3, Math.ceil(Math.max(typed.length, closest.length) * 0.34)));
	return closest.distance <= threshold ? closest.name : null;
}

function normalize(value) {
	return String(value || '').toLowerCase();
}

function levenshtein(left, right) {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
		const current = [leftIndex];
		for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
			const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
			current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, substitution);
		}
		previous.splice(0, previous.length, ...current);
	}
	return previous[right.length];
}

module.exports = { UserEvent, findClosestCommand, levenshtein };
