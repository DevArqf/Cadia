const handlers = new Map();
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

	const [, handler] = entry;
	await handler(interaction, context);
	return true;
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
	registerInteractionHandler,
	routeComponentInteraction
};
