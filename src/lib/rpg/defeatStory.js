const defeatScenes = {
	'gate-wisp': ({ enemy, warden }) =>
		`${enemy} slips through ${warden}'s guard and floods the ruins with dead-blue light. The final burst steals their footing, and the Warden falls beneath the Broken Gate.`,
	'rust-hound': ({ enemy, warden }) =>
		`${enemy} circles through the dust, then crashes into ${warden} with iron jaws and relentless weight. Their weapon skids across the stones as the hound delivers the final blow.`,
	'hollow-fire': ({ enemy, warden }) =>
		`${enemy} pours through every opening in ${warden}'s defense. Relic flame consumes the last of their strength, leaving the Warden defeated among the cooling ash.`,
	harlequin: ({ enemy, warden }) =>
		`${enemy} turns the fight into one last cruel performance. A feint draws ${warden}'s guard aside, and the killing strike lands before the ruined hall can echo a warning.`,
	'thorn-stalker': ({ enemy, warden }) =>
		`${enemy} vanishes into the brush before roots coil around ${warden}'s legs. A storm of thorns closes in, and the forest drags the defeated Warden into darkness.`,
	'mossbound-knight': ({ enemy, warden }) =>
		`${enemy} absorbs ${warden}'s final attack and answers with an ancient, two-handed blow. Bark and steel crash down together, ending the Warden's stand.`,
	'mossbound-regent': ({ enemy, warden }) =>
		`${enemy} commands the forest to kneel. Roots split the ground beneath ${warden}, and the Regent's crushing strike delivers the killing blow beneath a canopy of awakened thorns.`,
	'glass-mite': ({ enemy, warden }) =>
		`${enemy} fractures into a cloud of razor-bright crystal. The shards cut through ${warden}'s stance from every direction until the mine floor rises to meet them.`,
	'echo-miner': ({ enemy, warden }) =>
		`${enemy} repeats ${warden}'s own attack with terrible precision. The copied blow returns from the crystal walls again and again, leaving the Warden defeated in the ringing dark.`,
	mummy: ({ enemy, warden }) =>
		`${enemy} tears open the sealed echoes of the mine. A wave of ancient force catches ${warden} at its center, and the Matriarch's final strike silences the chamber.`
};

function createDefeatStory(result) {
	const encounter = result.encounter || {};
	const warden = result.profile?.name || 'The Warden';
	const context = { enemy: encounter.name || 'The enemy', warden };
	const scene =
		defeatScenes[encounter.id]?.(context) ||
		(encounter.boss
			? `${context.enemy} breaks through ${warden}'s last defense and delivers a decisive killing blow. The Warden collapses as the battlefield falls silent.`
			: `${context.enemy} survives ${warden}'s final action and strikes back without mercy. The counterattack drops the Warden, ending the encounter in defeat.`);

	return `${scene}\n\nA relic ward pulls **${warden}** back from death with **1 HP**, but the battle is lost. Recover, improve your gear, and return when you are ready.`;
}

module.exports = { createDefeatStory };
