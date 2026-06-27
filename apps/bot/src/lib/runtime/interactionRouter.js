const handlers = new Map();
const { MessageFlags } = require('discord.js');
const { MODULES, getGuildCommandConfig, isModuleEnabled } = require('./guildCommandConfig');

const moduleByPrefix = Object.freeze({
	gunfight: 'minigames',
	logging: 'logging',
	minigame: 'minigames',
	rpg: 'rpg',
	'rpg-bestiary': 'rpg',
	'rpg-boss': 'rpg',
	'rpg-inventory': 'rpg',
	'rpg-inventory-view': 'rpg',
	'rpg-lb': 'rpg',
	'rpg-profile': 'rpg',
	'rpg-quest': 'rpg',
	'rpg-tutorial': 'rpg',
	'rpg-tutorial-offer': 'rpg',
	suggestions: 'suggestions'
});
const restartSafeFallbackPrefixes = new Set([
	'alert',
	'bug',
	'calculator',
	'discovery',
	'eval-delete',
	'logging',
	'minigame',
	'poll',
	'rpg-bestiary',
	'rpg-inventory',
	'rpg-inventory-view',
	'rpg-lb',
	'rpg-profile',
	'rpg-quest',
	'rpg-tutorial',
	'rpg-tutorial-offer',
	'suggestions'
]);

function registerInteractionHandler(prefix, handler) {
	if (!prefix || typeof handler !== 'function') throw new TypeError('Interaction handlers require a prefix and handler function.');
	handlers.set(prefix, handler);
}

async function routeComponentInteraction(interaction, context = {}) {
	if (!interaction?.customId || !isRoutableComponent(interaction)) return false;

	const entry = [...handlers.entries()].find(([prefix]) => interaction.customId === prefix || interaction.customId.startsWith(`${prefix}:`));
	if (!entry) return false;

	const [prefix, handler] = entry;
	const moduleId = moduleByPrefix[prefix];
	if (moduleId && interaction.guildId) {
		const config = await getGuildCommandConfig(interaction.guildId);
		if (!isModuleEnabled(config, moduleId)) {
			await replyModuleDisabled(interaction, moduleId);
			return true;
		}
	}
	await handler(interaction, context);
	return true;
}

async function replyModuleDisabled(interaction, moduleId) {
	const payload = {
		content: `The **${MODULES[moduleId].name}** module is disabled in this server.`,
		flags: MessageFlags.Ephemeral
	};
	if (interaction.deferred || interaction.replied) return interaction.followUp(payload);
	return interaction.reply(payload);
}

function hasRestartSafeFallback(customId) {
	const prefix = String(customId || '').split(':')[0];
	return restartSafeFallbackPrefixes.has(prefix);
}

function clearInteractionHandlers() {
	handlers.clear();
}

function isRoutableComponent(interaction) {
	return interaction.isButton?.() || interaction.isStringSelectMenu?.() || interaction.isChannelSelectMenu?.() || interaction.isModalSubmit?.();
}

module.exports = {
	clearInteractionHandlers,
	hasRestartSafeFallback,
	moduleByPrefix,
	registerInteractionHandler,
	replyModuleDisabled,
	routeComponentInteraction
};
