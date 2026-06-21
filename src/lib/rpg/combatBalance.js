const mobDamageShares = {
	attack: 0.18,
	skill: 0.2,
	defend: 0.13
};

const mobCounterShares = {
	attack: 0.12,
	skill: 0.12,
	defend: 0.08,
	flee: 0.12
};

function balancePlayerDamage(encounter, stance, calculatedDamage) {
	if (encounter.boss || stance === 'flee') return calculatedDamage;
	const minimumShare = mobDamageShares[stance] || mobDamageShares.attack;
	return Math.max(calculatedDamage, Math.ceil(encounter.hp * minimumShare));
}

function balanceEnemyDamage(encounter, stance, calculatedDamage, playerMaxHp) {
	if (encounter.boss) return calculatedDamage;
	const maximumShare = mobCounterShares[stance] || mobCounterShares.attack;
	return Math.min(calculatedDamage, Math.max(Math.floor(playerMaxHp * maximumShare), 1));
}

function guaranteedMobLoot(profile, encounter, rolledLoot, randomInt) {
	if (rolledLoot || encounter.boss || !encounter.loot?.length) return rolledLoot;
	const nextVictory = (profile.battlesWon || 0) + 1;
	if (nextVictory % 3 !== 0) return null;
	return encounter.loot[randomInt(0, encounter.loot.length - 1)];
}

module.exports = {
	balanceEnemyDamage,
	balancePlayerDamage,
	guaranteedMobLoot,
	mobCounterShares,
	mobDamageShares
};
