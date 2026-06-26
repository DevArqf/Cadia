const XP_PER_LEVEL = 100;

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
	XP_PER_LEVEL,
	getLevelProgress,
	getUserRank,
	sortLevels
};
