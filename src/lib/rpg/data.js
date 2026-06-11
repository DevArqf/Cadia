const classes = {
	vanguard: {
		id: 'vanguard',
		name: 'Vanguard',
		icon: 'Shield',
		skill: 'Iron Oath',
		description: 'A front-line defender with steady damage and high guard.',
		stats: { hp: 850, attack: 72, defense: 62, speed: 28, luck: 18, focus: 18 },
		growth: { hp: 165, attack: 11, defense: 10, speed: 4, luck: 3, focus: 3 }
	},
	hexblade: {
		id: 'hexblade',
		name: 'Hexblade',
		icon: 'Blade',
		skill: 'Risk Cut',
		description: 'A volatile duelist with strong critical bursts.',
		stats: { hp: 680, attack: 104, defense: 34, speed: 48, luck: 38, focus: 28 },
		growth: { hp: 125, attack: 15, defense: 6, speed: 7, luck: 6, focus: 4 }
	},
	arcanist: {
		id: 'arcanist',
		name: 'Arcanist',
		icon: 'Rune',
		skill: 'Starflare',
		description: 'A focused caster who turns relic energy into damage.',
		stats: { hp: 620, attack: 76, defense: 32, speed: 36, luck: 28, focus: 78 },
		growth: { hp: 115, attack: 10, defense: 6, speed: 5, luck: 4, focus: 12 }
	},
	ranger: {
		id: 'ranger',
		name: 'Ranger',
		icon: 'Scout',
		skill: 'Clean Shot',
		description: 'A quick hunter with better dodge and loot odds.',
		stats: { hp: 720, attack: 78, defense: 44, speed: 82, luck: 52, focus: 20 },
		growth: { hp: 135, attack: 11, defense: 7, speed: 12, luck: 8, focus: 3 }
	},
	cleric: {
		id: 'cleric',
		name: 'Cleric',
		icon: 'Light',
		skill: 'Mend',
		description: 'A survivor with healing and safer expeditions.',
		stats: { hp: 790, attack: 54, defense: 54, speed: 28, luck: 30, focus: 84 },
		growth: { hp: 155, attack: 8, defense: 9, speed: 4, luck: 5, focus: 12 }
	}
};

const origins = {
	blackforge: 'Raised under black iron halls where every promise is hammered twice.',
	moonfen: 'A survivor of drowned roads, mist rituals, and quiet warnings.',
	skyreach: 'Born around towers that watched the stars disappear one by one.',
	lowmarket: 'A street-smart runner from markets built over ancient ruins.'
};

const regions = {
	'broken-gate': {
		id: 'broken-gate',
		name: 'The Broken Gate',
		chapter: 1,
		description: 'The first rupture where Cadia found the relic storm.',
		unlockRank: 1,
		bossId: 'harlequin'
	},
	'ashwood-outskirts': {
		id: 'ashwood-outskirts',
		name: 'Ashwood Outskirts',
		chapter: 2,
		description: 'A living forest where corrupted roots move after dusk.',
		unlockRank: 5,
		requiredBoss: 'harlequin',
		bossId: 'mossbound-regent'
	},
	'glassmine-depths': {
		id: 'glassmine-depths',
		name: 'Glassmine Depths',
		chapter: 3,
		description: 'A crystal mine humming with voices from below the stone.',
		unlockRank: 10,
		requiredBoss: 'mossbound-regent',
		bossId: 'mummy'
	}
};

const items = {
	warden_blade: {
		id: 'warden_blade',
		name: 'Warden Blade',
		emojiKey: 'wardenBlade',
		emoji: '<:WardenBlade:1513937010056892498>',
		slot: 'weapon',
		rarity: 'common',
		stats: { attack: 45 },
		traits: ['steel'],
		description: 'A starter blade marked with a quiet blue notch.'
	},
	ash_charm: {
		id: 'ash_charm',
		name: 'Ash Charm',
		emojiKey: 'ashCharm',
		emoji: '<:AshCharm:1513937012237926552>',
		slot: 'charm',
		rarity: 'uncommon',
		stats: { luck: 24, focus: 18 },
		traits: ['arcane'],
		description: 'Warm to the touch after a successful encounter.'
	},
	glass_pick: {
		id: 'glass_pick',
		name: 'Glass Pick',
		emojiKey: 'glassPick',
		emoji: '<:GlassPick:1513938910969991349>',
		slot: 'weapon',
		rarity: 'rare',
		stats: { attack: 95, focus: 34 },
		traits: ['pierce', 'crystal'],
		description: 'A mining tool sharpened into a crystalline weapon.'
	},
	gate_cloak: {
		id: 'gate_cloak',
		name: 'Gate Cloak',
		emojiKey: 'gateCloak',
		emoji: '<:GateCloak:1514044764729638932>',
		slot: 'armor',
		rarity: 'common',
		stats: { defense: 48, hp: 140 },
		traits: ['warded'],
		description: 'A dark travel cloak stitched for relic weather.'
	},
	ember_spear: {
		id: 'ember_spear',
		name: 'Ember Spear',
		emojiKey: 'emberSpear',
		emoji: '<:EmberSpear:1514044763190329385>',
		slot: 'weapon',
		rarity: 'uncommon',
		stats: { attack: 72, speed: 12 },
		traits: ['flame', 'pierce'],
		description: 'A charred spearhead that still carries Ashwood heat.'
	},
	rootguard_plate: {
		id: 'rootguard_plate',
		name: 'Rootguard Plate',
		emojiKey: 'rootguardPlate',
		emoji: '<:RootguardPlate:1514044766583783484>',
		slot: 'armor',
		rarity: 'uncommon',
		stats: { defense: 72, hp: 260, speed: -8 },
		traits: ['warded'],
		description: 'Dense living bark armor that trades speed for survival.'
	},
	echo_lens: {
		id: 'echo_lens',
		name: 'Echo Lens',
		emojiKey: 'echoLens',
		emoji: '<:EchoLens:1514044767774707753>',
		slot: 'charm',
		rarity: 'rare',
		stats: { focus: 52, luck: 18 },
		traits: ['arcane', 'crystal'],
		description: 'A glass charm that hums when a hidden spell is nearby.'
	},
	star_salve: {
		id: 'star_salve',
		name: 'Star Salve',
		emojiKey: 'starSalve',
		emoji: '<:StarSalve:1514044769184120886>',
		slot: 'consumable',
		rarity: 'common',
		stats: { hp: 260 },
		description: 'Restores a small amount of HP after an expedition.'
	}
};

const encounters = {
	'broken-gate': [
		{ id: 'gate-wisp', name: 'Gate Wisp', hp: 620, attack: 66, defense: 18, xp: 38, gold: [48, 92], loot: ['star_salve', 'gate_cloak'], weaknesses: ['arcane', 'warded'], strengths: ['steel'] },
		{ id: 'rust-hound', name: 'Rust Hound', hp: 760, attack: 78, defense: 32, xp: 46, gold: [64, 120], loot: ['warden_blade'], weaknesses: ['pierce', 'steel'], strengths: ['flame'] },
		{ id: 'hollow-fire', name: 'Hollow Fire', hp: 680, attack: 86, defense: 22, xp: 43, gold: [58, 112], loot: ['ash_charm'], weaknesses: ['flame', 'arcane'], strengths: ['warded'] },
		{
			id: 'harlequin',
			name: 'Harlequin',
			hp: 2600,
			attack: 185,
			defense: 72,
			xp: 145,
			gold: [260, 420],
			loot: ['ash_charm', 'warden_blade', 'gate_cloak'],
			weaknesses: ['steel', 'warded'],
			strengths: ['arcane'],
			strategy: 'Harlequin punishes pure magic. Bring steel damage and warded armor to survive her burst turns.',
			boss: true,
			weight: 8
		}
	],
	'ashwood-outskirts': [
		{ id: 'thorn-stalker', name: 'Thorn Stalker', hp: 1500, attack: 155, defense: 74, xp: 72, gold: [130, 250], loot: ['ash_charm', 'star_salve', 'ember_spear'], weaknesses: ['flame', 'pierce'], strengths: ['arcane'] },
		{ id: 'mossbound-knight', name: 'Mossbound Knight', hp: 1780, attack: 142, defense: 112, xp: 82, gold: [150, 290], loot: ['rootguard_plate', 'ember_spear'], weaknesses: ['flame', 'steel'], strengths: ['warded'] },
		{
			id: 'mossbound-regent',
			name: 'Mossbound Regent',
			hp: 5200,
			attack: 330,
			defense: 180,
			xp: 260,
			gold: [520, 840],
			loot: ['rootguard_plate', 'ember_spear', 'ash_charm'],
			weaknesses: ['flame', 'pierce'],
			strengths: ['warded'],
			strategy: 'The Regent is heavily armored. Pierce damage and flame traits cut through its bark shell.',
			boss: true,
			weight: 6
		}
	],
	'glassmine-depths': [
		{ id: 'glass-mite', name: 'Glass Mite', hp: 2600, attack: 245, defense: 145, xp: 112, gold: [250, 420], loot: ['glass_pick', 'echo_lens'], weaknesses: ['steel', 'pierce'], strengths: ['crystal'] },
		{ id: 'echo-miner', name: 'Echo Miner', hp: 2900, attack: 270, defense: 128, xp: 126, gold: [280, 460], loot: ['glass_pick', 'ash_charm', 'echo_lens'], weaknesses: ['arcane', 'crystal'], strengths: ['steel'] },
		{
			id: 'mummy',
			name: 'Mummy',
			hp: 9400,
			attack: 520,
			defense: 285,
			xp: 440,
			gold: [980, 1500],
			loot: ['glass_pick', 'echo_lens', 'ash_charm'],
			weaknesses: ['arcane', 'crystal'],
			strengths: ['steel'],
			strategy: 'The Matriarch reflects normal steel pressure. Arcane focus and crystal gear break her echo shield.',
			boss: true,
			weight: 5
		}
	]
};

const questSteps = [
	'Create your Warden profile and step through the Broken Gate.',
	'Win encounters to gather starter gear.',
	'Reach Rank 5 and defeat Harlequin to unlock Ashwood Outskirts.',
	'Defeat the Mossbound Regent to unlock the Glassmine Depths.',
	'Recover rare gear and prepare for deeper boss fights.'
];

const npcQuests = [
	{
		id: 'larry-gate-wisp-lanterns',
		npc: {
			name: 'Larry',
			portrait: 'Larry.png',
			role: 'Gate Lantern Keeper'
		},
		regionId: 'broken-gate',
		title: 'Lanterns That Whisper',
		intro:
			'The lanterns along the Broken Gate are repeating names that nobody remembers. Larry lowers his voice and asks you to silence the wisps before the whispers spread.',
		objectiveText: 'Defeat 3 Gate Wisps in The Broken Gate, then return to Larry.',
		targets: [{ encounterId: 'gate-wisp', amount: 3 }],
		rewards: { gold: 180, xp: 70, shards: 1, items: ['star_salve'] },
		completeText: 'Larry shields the lantern flame with both hands. The whispers fade, and one clean shard drops into your palm.'
	},
	{
		id: 'hunter-rust-hound-tracks',
		npc: {
			name: 'Hunter',
			portrait: 'Hunter.png',
			role: 'Ruin Tracker'
		},
		regionId: 'broken-gate',
		title: 'Iron Teeth In The Dust',
		intro:
			'Hunter points to claw marks dragged through the market dust. Rust Hounds are circling the old roads, and he wants their trail broken before caravans return.',
		objectiveText: 'Defeat 2 Rust Hounds in The Broken Gate, then return to Hunter.',
		targets: [{ encounterId: 'rust-hound', amount: 2 }],
		rewards: { gold: 220, xp: 85, items: ['warden_blade'] },
		completeText: 'Hunter checks the ruined collars you brought back and nods once. The road is quieter now.'
	},
	{
		id: 'carys-hollow-fire-embers',
		npc: {
			name: 'Carys',
			portrait: 'Carys.png',
			role: 'Ash Reader'
		},
		regionId: 'broken-gate',
		title: 'Ash That Remembers',
		intro:
			'Carys studies a smear of orange ash that refuses to cool. Hollow Fire has been feeding on old spellwork, and she needs proof before it consumes another block.',
		objectiveText: 'Defeat 2 Hollow Fires in The Broken Gate, then return to Carys.',
		targets: [{ encounterId: 'hollow-fire', amount: 2 }],
		rewards: { gold: 240, xp: 90, items: ['ash_charm'] },
		completeText: 'Carys presses the ember fragments into a charm casing. The ash finally sleeps.'
	},
	{
		id: 'rocky-thorn-stalker-roots',
		npc: {
			name: 'Rocky',
			portrait: 'Rocky.png',
			role: 'Ashwood Pathbreaker'
		},
		regionId: 'ashwood-outskirts',
		title: 'Roots Across The Road',
		intro:
			'Rocky has mapped three safe paths through Ashwood. By sunrise, thorn trails covered all of them. He needs the Stalkers cut down before the forest closes.',
		objectiveText: 'Defeat 3 Thorn Stalkers in Ashwood Outskirts, then return to Rocky.',
		targets: [{ encounterId: 'thorn-stalker', amount: 3 }],
		rewards: { gold: 420, xp: 160, shards: 1, items: ['ember_spear'] },
		completeText: 'Rocky marks the path with fresh chalk. For the first time today, the trees do not move it.'
	},
	{
		id: 'emma-mossbound-oath',
		npc: {
			name: 'Emma',
			portrait: 'Emma.png',
			role: 'Forest Archivist'
		},
		regionId: 'ashwood-outskirts',
		title: 'The Green Oath',
		intro:
			'Emma found old knight vows carved under living moss. The Mossbound still answer them, and she asks you to break their patrol before the Regent wakes.',
		objectiveText: 'Defeat 2 Mossbound Knights in Ashwood Outskirts, then return to Emma.',
		targets: [{ encounterId: 'mossbound-knight', amount: 2 }],
		rewards: { gold: 520, xp: 190, items: ['rootguard_plate'] },
		completeText: 'Emma records the broken oath in a careful hand. The forest lets the ink dry.'
	},
	{
		id: 'ellon-glass-mite-prisms',
		npc: {
			name: 'Ellon',
			portrait: 'Ellon.png',
			role: 'Glassmine Surveyor'
		},
		regionId: 'glassmine-depths',
		title: 'Prisms Under Skin',
		intro:
			'Ellon taps a crystal sample and winces when something taps back. Glass Mites are nesting in the mine seams, and every prism they hatch makes the echoes louder.',
		objectiveText: 'Defeat 3 Glass Mites in Glassmine Depths, then return to Ellon.',
		targets: [{ encounterId: 'glass-mite', amount: 3 }],
		rewards: { gold: 760, xp: 260, shards: 1, items: ['echo_lens'] },
		completeText: 'Ellon seals the prism jar with wax. The mine stops answering for a moment.'
	},
	{
		id: 'gary-echo-miner-tools',
		npc: {
			name: 'Gary',
			portrait: 'Gary.png',
			role: 'Lost Foreman'
		},
		regionId: 'glassmine-depths',
		title: 'Tools That Swing Alone',
		intro:
			'Gary counts abandoned pickaxes and keeps arriving at one too many. Echo Miners are copying the old crew, and he wants the false shift ended.',
		objectiveText: 'Defeat 2 Echo Miners in Glassmine Depths, then return to Gary.',
		targets: [{ encounterId: 'echo-miner', amount: 2 }],
		rewards: { gold: 840, xp: 290, items: ['glass_pick'] },
		completeText: 'Gary hangs the recovered tags on a snapped rail. The mine is still dangerous, but at least it is honest.'
	}
];

module.exports = {
	classes,
	encounters,
	items,
	npcQuests,
	origins,
	questSteps,
	regions
};
