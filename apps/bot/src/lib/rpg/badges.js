const path = require('node:path');
const { emojis } = require('../../config');

const badgeAssetDir = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Badges');

function badgeEmoji(badge) {
	return emojis.custom[badge?.emojiKey] || '';
}

function badgeAssetPath(badge) {
	return badge?.image ? path.join(badgeAssetDir, badge.image) : null;
}

function formatBadge(badge, suffix = 'Badge') {
	if (!badge) return suffix;
	return `${badgeEmoji(badge)} **${badge.name} ${suffix}**`.trim();
}

module.exports = { badgeAssetPath, badgeEmoji, formatBadge };
