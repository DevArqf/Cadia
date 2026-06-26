const XP_PER_LEVEL = 100;
const MESSAGE_XP_COOLDOWN_MS = 90_000;
const BASE_MESSAGE_XP = 1;
const CHARACTERS_PER_BONUS_XP = 100;
const MAX_CHARACTER_BONUS_XP = 3;
const IMAGE_BONUS_XP = 2;
const MAX_MESSAGE_XP = BASE_MESSAGE_XP + MAX_CHARACTER_BONUS_XP + IMAGE_BONUS_XP;

function calculateMessageXp(message) {
	const characterCount = normalizeMessageContent(message?.content).length;
	const characterBonus = Math.min(Math.floor(characterCount / CHARACTERS_PER_BONUS_XP), MAX_CHARACTER_BONUS_XP);
	const imageBonus = hasImageAttachment(message?.attachments) ? IMAGE_BONUS_XP : 0;

	return Math.min(BASE_MESSAGE_XP + characterBonus + imageBonus, MAX_MESSAGE_XP);
}

function normalizeMessageContent(content) {
	return typeof content === 'string' ? content.trim().replace(/\s+/g, ' ') : '';
}

function hasImageAttachment(attachments) {
	if (!attachments) return false;
	const values = typeof attachments.values === 'function' ? [...attachments.values()] : Array.isArray(attachments) ? attachments : [];

	return values.some((attachment) => {
		if (attachment?.contentType?.toLowerCase().startsWith('image/')) return true;
		const fileName = attachment?.name || attachment?.url || '';
		return /\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(fileName);
	});
}

class CooldownTracker {
	constructor(durationMs) {
		this.durationMs = durationMs;
		this.expirations = new Map();
		this.nextSweepAt = 0;
	}

	tryAcquire(key, now = Date.now()) {
		this.sweep(now);
		if ((this.expirations.get(key) || 0) > now) return false;
		this.expirations.set(key, now + this.durationMs);
		return true;
	}

	release(key) {
		this.expirations.delete(key);
	}

	sweep(now) {
		if (now < this.nextSweepAt) return;
		for (const [key, expiresAt] of this.expirations) {
			if (expiresAt <= now) this.expirations.delete(key);
		}
		this.nextSweepAt = now + this.durationMs;
	}
}

function getLevelProgress(level) {
	const currentXp = Math.max(0, Number(level?.userXp) || 0);
	const currentLevel = Math.max(1, Number(level?.userLevel) || 1);
	const totalXp = Math.max(0, Number(level?.totalXp) || 0);

	return {
		currentXp,
		currentLevel,
		totalXp,
		neededXp: XP_PER_LEVEL,
		progress: Math.min(currentXp / XP_PER_LEVEL, 1)
	};
}

function sortLevels(levels) {
	return [...levels].sort((a, b) => {
		const totalDifference = (b.totalXp ?? 0) - (a.totalXp ?? 0);
		if (totalDifference !== 0) return totalDifference;
		return (b.userLevel ?? 1) - (a.userLevel ?? 1);
	});
}

function getUserRank(levels, userId) {
	const sorted = sortLevels(levels);
	const index = sorted.findIndex((level) => level.userId === userId);
	return index === -1 ? sorted.length + 1 : index + 1;
}

module.exports = {
	MESSAGE_XP_COOLDOWN_MS,
	XP_PER_LEVEL,
	CooldownTracker,
	calculateMessageXp,
	getLevelProgress,
	getUserRank,
	hasImageAttachment,
	sortLevels
};
