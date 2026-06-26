const activeActions = new Map();

function getActiveAction(guildId, userId, now = Date.now()) {
	const key = actionKey(guildId, userId);
	const action = activeActions.get(key);
	if (!action) return null;

	if (action.expiresAt <= now) {
		activeActions.delete(key);
		return null;
	}

	return action;
}

function setActiveAction(guildId, userId, type, now = Date.now()) {
	const action = {
		type,
		expiresAt: now + (type === 'battle' ? 180_000 : 120_000)
	};
	activeActions.set(actionKey(guildId, userId), action);
	return action;
}

function clearActiveAction(guildId, userId) {
	return activeActions.delete(actionKey(guildId, userId));
}

function actionKey(guildId, userId) {
	return `${guildId}:${userId}`;
}

module.exports = {
	clearActiveAction,
	getActiveAction,
	setActiveAction
};
