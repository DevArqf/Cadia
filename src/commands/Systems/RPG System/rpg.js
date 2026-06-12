const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../../config');
const { PermissionLevels } = require('../../../lib/types/Enums');
const {
	ActionRowBuilder,
	ButtonStyle,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	SectionBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder
} = require('discord.js');
const { actionButton, componentReply, notice, panel } = require('../../../lib/util/components');
const {
	adventureStoryImage,
	battleResultImage,
	createProfileImageAttachment,
	createTravelImageAttachment,
	npcPortrait,
	sceneImages
} = require('../../../lib/rpg/assets');
const { createBossBattleCard, createEncounterBattleCard, hasEncounterBattleCard } = require('../../../lib/rpg/battleCanvas');
const { classes, encounters, items, npcQuests, origins, regions } = require('../../../lib/rpg/data');
const { createInventoryCard } = require('../../../lib/rpg/inventoryCanvas');
const { createRpgLeaderboardCard } = require('../../../lib/rpg/leaderboardCanvas');
const { createQuestPageCard } = require('../../../lib/rpg/questCanvas');
const rpg = require('../../../lib/rpg/service');

const icon = {
	actions: emojis.custom.orbPurple || emojis.custom.rpgInfo || 'Actions',
	chapter: emojis.custom.rpgchapter || emojis.custom.rpgInfo || 'Chapter',
	class: emojis.custom.user || emojis.custom.person || 'Class',
	clock: emojis.custom.rpgtime || 'Time',
	coin: emojis.custom.coin || 'Coin',
	compass: emojis.custom.rpgglobe || emojis.custom.globe || 'Travel',
	deleted: emojis.custom.trash || 'Deleted',
	equipment: emojis.custom.equip || emojis.custom.equipment || 'Equipment',
	harleyquinBoss: emojis.custom.harleyquinBoss || 'Harleyquin Boss',
	fail: emojis.custom.fail || 'Fail',
	folder: emojis.custom.backpack || 'Item',
	forbidden: emojis.custom.forbidden || 'Forbidden',
	arrowRight: emojis.custom.right || '> ',
	shards: emojis.custom.shards || 'Shard',
	health: {
		full: emojis.custom.rpgheartFull || '♥',
		half: emojis.custom.rpgheartHalf || '◐',
		empty: emojis.custom.rpgheartEmpty || '♡'
	},
	info: emojis.custom.rpgInfo || 'Info',
	leaderboard: emojis.custom.crown || 'Leaderboard',
	leaderboardBackground: emojis.custom.rpglb_bg || '',
	level: emojis.custom.orbPurple || 'Level',
	loot: emojis.custom.backpack || 'Loot',
	objective: emojis.custom.quill || 'Objective',
	owner: emojis.custom.rpguser || 'Owner',
	person: emojis.custom.rpguser || 'User',
	region: emojis.custom.rpgglobe || emojis.custom.globe || 'Region',
	settings: emojis.custom.rpgCogGold || emojis.custom.rpgCogSilver || 'Stats',
	success: emojis.custom.success || 'Success',
	threat: emojis.custom.skull || 'Threat',
	warning: emojis.custom.warning || 'Warning',
	damageDealt: emojis.custom.damageDealt || '',
	damageTaken: emojis.custom.damageTaken || '',
	xp: Array.from({ length: 21 }, (_, index) => emojis.custom[`xp_${index}`]),
	xpLabel: emojis.custom.orbPurple || 'XP',
	items: {
		warden_blade: emojis.custom.wardenBlade || '',
		ash_charm: emojis.custom.ashCharm || '',
		glass_pick: emojis.custom.glassPick || '',
		ember_spear: emojis.custom.emberSpear || '',
		gate_cloak: emojis.custom.gateCloak || '',
		rootguard_plate: emojis.custom.rootguardPlate || '',
		echo_lens: emojis.custom.echoLens || '',
		star_salve: emojis.custom.starSalve || ''
	},
	rank: {
		f: emojis.custom.letterf || 'F',
		e: emojis.custom.lettere || 'E',
		d: emojis.custom.letterd || 'D',
		c: emojis.custom.letterc || 'C',
		b: emojis.custom.letterb || 'B',
		a: emojis.custom.lettera || 'A',
		s: emojis.custom.letters || 'S',
		ss: emojis.custom.letterss || 'SS',
		sss: emojis.custom.lettersss || 'SSS'
	}
};

const leaderboardPageSize = 6;
const activeRpgActions = new Map();
const leaderboardTypes = [
	{ id: 'level', label: 'Level', description: 'Highest level and XP progress', emoji: icon.rank.s },
	{ id: 'gold', label: 'Gold', description: 'Richest Wardens', emoji: icon.coin },
	{ id: 'wins', label: 'Victories', description: 'Most encounters cleared', emoji: icon.success },
	{ id: 'shards', label: 'Relic Shards', description: 'Most story relic shards', emoji: icon.shards }
];
const adminCurrencies = [
	{ name: 'Gold', value: 'gold' },
	{ name: 'Relic Shards', value: 'shards' },
	{ name: 'XP', value: 'xp' },
	{ name: 'Level', value: 'level' }
];
const adminBossChoices = Object.values(encounters)
	.flat()
	.filter((encounter) => encounter.boss)
	.map((encounter) => ({ name: encounter.name, value: encounter.id }));
const inventoryCategories = [
	{ id: 'weapon', label: 'Weapons', action: 'equip' },
	{ id: 'armor', label: 'Armor', action: 'equip' },
	{ id: 'charm', label: 'Charms', action: 'equip' },
	{ id: 'consumable', label: 'Consumables', action: 'use' }
];
const tutorialSteps = [
	{
		title: 'Create Your Warden',
		body: [
			'Start with `/rpg create` and choose a name, class, and origin.',
			'Your class decides your starting stats and how your character grows when ranking up.',
			'Your character ID is your permanent RPG lookup code. You can get it with `/rpg id` or from `/rpg profile`.'
		]
	},
	{
		title: 'Read Your Profile',
		body: [
			'Use `/rpg profile` to check Rank, XP progress, HP condition, gold, shards, stats, and equipped gear.',
			'Profile buttons open Inventory, Quests, Equip, and Travel without needing to remember every command.',
			'Stats come from your class plus whatever gear you equip.'
		]
	},
	{
		title: 'Explore For Encounters',
		body: [
			'Use `/rpg adventure` to explore your current region.',
			'Adventures begin with a short story scene, then you continue forward to reveal a region mob.',
			'Normal adventures are for farming XP, gold, and gear. Bosses do not randomly appear there.'
		]
	},
	{
		title: 'Gear Matters',
		body: [
			'Defeated mobs can drop weapons, armor, charms, and consumables.',
			'Use `/rpg inventory` to inspect what you own and `/rpg equip` to wear it.',
			'Gear changes your effective stats. Some gear also has traits like steel, warded, pierce, flame, arcane, or crystal.'
		]
	},
	{
		title: 'Boss Gates And Travel',
		body: [
			'Use `/rpg boss-info` before attempting a boss. It shows HP, attack, defense, weaknesses, resistances, and drops.',
			'When you reach the required Rank, use `/rpg travel` to attempt the boss gate for the next region.',
			'If you lose, farm better gear from mobs, equip around the boss weakness, then try travel again.'
		]
	},
	{
		title: 'Progression Loop',
		body: [
			'The loop is: explore, win gear, equip smarter, rank up, study the boss, clear the boss gate, then travel onward.',
			'HP is restored when starting adventures and boss attempts, so a loss does not trap your character.',
			'Use `/rpg quest` when you need your next objective.'
		]
	}
];

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			defaultCooldown: 5,
			description: 'Play the Cadia story RPG'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('rpg')
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('create')
						.setDescription('Create your Warden character')
						.addStringOption((option) =>
							option.setName('name').setDescription('Your character name').setMinLength(2).setMaxLength(32).setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName('class')
								.setDescription('Your class')
								.setRequired(true)
								.addChoices(...Object.values(classes).map((entry) => ({ name: entry.name, value: entry.id })))
						)
						.addStringOption((option) =>
							option
								.setName('origin')
								.setDescription('Your story origin')
								.setRequired(true)
								.addChoices(...Object.keys(origins).map((origin) => ({ name: titleCase(origin), value: origin })))
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('profile')
						.setDescription('View an RPG profile')
						.addUserOption((option) => option.setName('user').setDescription('The user to inspect').setRequired(false))
				)
				.addSubcommand((subcommand) => subcommand.setName('id').setDescription('Get your RPG character ID'))
				.addSubcommand((subcommand) => subcommand.setName('tutorial').setDescription('Learn how the RPG system works'))
				.addSubcommand((subcommand) => subcommand.setName('quest').setDescription('View your current story quest'))
				.addSubcommand((subcommand) =>
					subcommand
						.setName('travel')
						.setDescription('Travel to an unlocked region')
						.addStringOption((option) =>
							option
								.setName('region')
								.setDescription('The region to travel to')
								.setRequired(true)
								.addChoices(...Object.values(regions).map((region) => ({ name: region.name, value: region.id })))
						)
				)
				.addSubcommand((subcommand) => subcommand.setName('adventure').setDescription('Start a story encounter with RNG combat'))
				.addSubcommand((subcommand) =>
					subcommand
						.setName('inventory')
						.setDescription('View an RPG inventory')
						.addUserOption((option) => option.setName('user').setDescription('The user to inspect').setRequired(false))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('equip')
						.setDescription('Equip an RPG item')
						.addStringOption((option) =>
							option.setName('item').setDescription('The item to equip').setRequired(true).setAutocomplete(true)
						)
				)
				.addSubcommand((subcommand) => subcommand.setName('leaderboard').setDescription('View the RPG leaderboard'))
				.addSubcommand((subcommand) => subcommand.setName('bestiary').setDescription('Inspect RPG bosses and mobs'))
				.addSubcommand((subcommand) => subcommand.setName('delete').setDescription('Delete your RPG character'))
				.addSubcommandGroup((group) =>
					group
						.setName('admin')
						.setDescription('Developer RPG administration')
						.addSubcommand((subcommand) =>
							subcommand
								.setName('find')
								.setDescription('Find a character ID from a Discord user')
								.addUserOption((option) => option.setName('user').setDescription('The character owner').setRequired(true))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('inspect')
								.setDescription('Inspect a character by unique ID')
								.addStringOption((option) => option.setName('id').setDescription('The RPG character ID').setRequired(true))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('add-currency')
								.setDescription('Adjust a character currency or progression value')
								.addStringOption((option) => option.setName('id').setDescription('The RPG character ID').setRequired(true))
								.addStringOption((option) =>
									option
										.setName('currency')
										.setDescription('The value to adjust')
										.setRequired(true)
										.addChoices(...adminCurrencies)
								)
								.addIntegerOption((option) => option.setName('amount').setDescription('Amount to add or remove').setRequired(true))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('add-item')
								.setDescription('Add an item to a character inventory')
								.addStringOption((option) => option.setName('id').setDescription('The RPG character ID').setRequired(true))
								.addStringOption((option) =>
									option
										.setName('item')
										.setDescription('The item to add')
										.setRequired(true)
										.addChoices(...Object.values(items).map((item) => ({ name: item.name, value: item.id })))
								)
								.addIntegerOption((option) =>
									option.setName('quantity').setDescription('How many to add').setRequired(false).setMinValue(1).setMaxValue(99)
								)
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('wipe')
								.setDescription('Wipe a character by unique ID')
								.addStringOption((option) => option.setName('id').setDescription('The RPG character ID').setRequired(true))
								.addBooleanOption((option) =>
									option.setName('confirm').setDescription('Confirm this destructive action').setRequired(true)
								)
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('max')
								.setDescription('Max a character and grant every RPG item')
								.addStringOption((option) => option.setName('id').setDescription('The RPG character ID').setRequired(true))
						)
						.addSubcommand((subcommand) =>
							subcommand.setName('harlequin').setDescription('Force-start the Harlequin boss fight for yourself')
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('boss')
								.setDescription('Force-start any RPG boss fight for yourself')
								.addStringOption((option) =>
									option
										.setName('boss')
										.setDescription('The boss fight to test')
										.setRequired(true)
										.addChoices(...adminBossChoices)
								)
						)
				)
		);
	}

	async chatInputRun(interaction) {
		try {
			const group = interaction.options.getSubcommandGroup(false);
			const subcommand = interaction.options.getSubcommand();
			if (group === 'admin') return adminPanel(interaction, subcommand);
			if (!(await canUseRpg(interaction.user.id))) return interaction.reply(rpgUnavailableReply());
			if (subcommand !== 'tutorial' && (await rpg.shouldOfferTutorial(interaction.guild.id, interaction.user.id))) {
				return offerTutorial(interaction);
			}
			if (subcommand === 'create') return createCharacter(interaction);
			if (subcommand === 'profile') return showProfile(interaction);
			if (subcommand === 'id') return showCharacterId(interaction);
			if (subcommand === 'tutorial') return runTutorial(interaction);
			if (subcommand === 'quest') return showQuest(interaction);
			if (subcommand === 'travel') return travel(interaction);
			if (subcommand === 'adventure') return adventure(interaction);
			if (subcommand === 'inventory') return inventory(interaction);
			if (subcommand === 'equip') return equip(interaction);
			if (subcommand === 'leaderboard') return leaderboard(interaction);
			if (subcommand === 'bestiary') return bestiary(interaction);
			if (subcommand === 'delete') return deleteCharacter(interaction);
		} catch (error) {
			return sendRpgIssue(interaction, error);
		}
	}

	async autocompleteRun(interaction) {
		if (interaction.options.getSubcommand(false) !== 'equip') return interaction.respond([]);

		try {
			const profile = await rpg.requireProfile(interaction.guild.id, interaction.user.id);
			const focused = interaction.options.getFocused().toLowerCase();
			const ownedEquipableItems = getOwnedEquipableItems(profile)
				.filter(({ item }) => !focused || item.name.toLowerCase().includes(focused) || item.id.toLowerCase().includes(focused))
				.slice(0, 25)
				.map(({ item, quantity }) => ({
					name: `${item.name} (${titleCase(item.slot)} - owned x${quantity})`,
					value: item.id
				}));

			return interaction.respond(ownedEquipableItems);
		} catch {
			return interaction.respond([]);
		}
	}
}

async function createCharacter(interaction) {
	const profile = await rpg.createProfile(
		interaction.guild.id,
		interaction.user.id,
		interaction.options.getString('name', true),
		interaction.options.getString('class', true),
		interaction.options.getString('origin', true)
	);

	return interaction.reply(
		componentReply(
			panel({
				accentColor: color.RPG,
				title: `${icon.leaderboard} **Warden Registered**`,
				subtitle: 'Chapter I - The Broken Gate',
				image: sceneImages['broken-gate'],
				sections: [
					`${icon.person} **${profile.name}** has stepped into Cadia's relic storm.`,
					[
						`${icon.class} **Class:** ${classes[profile.classId].name}`,
						`${icon.region} **Origin:** ${titleCase(profile.origin)}`,
						`${icon.info} **Character ID:** \`${profile.characterId}\``,
						`${icon.coin} **Starting Gold:** ${profile.gold}`,
						`${icon.folder} **Starter Item:** Star Salve`
					],
					`${icon.info} Use **/rpg adventure** to begin your first encounter.`
				],
				footer: `${icon.clock} Created <t:${Math.floor(profile.createdAt / 1000)}:R>`
			})
		)
	);
}

async function offerTutorial(interaction) {
	await rpg.markTutorialOffered(interaction.guild.id, interaction.user.id);
	const customIdBase = `rpg-tutorial-offer:${interaction.id}`;
	const message = await sendInteractiveRpgReply(interaction, componentReply(buildTutorialOfferPanel(customIdBase), true));
	if (!message) return;

	const collector = message.createMessageComponentCollector({ time: 120_000, max: 1 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(componentReply(notice(`${icon.forbidden} **Not Your Tutorial**`, 'Run `/rpg tutorial` to open your own guide.'), true));
		}

		if (i.customId === `${customIdBase}:skip`) {
			await rpg.markTutorialSkipped(i.guild.id, i.user.id);
			return i.update({
				components: [notice(`${icon.success} **Tutorial Skipped**`, 'You can reopen it anytime with `/rpg tutorial`.', color.success)]
			});
		}

		if (i.customId === `${customIdBase}:start`) return runTutorial(i, true);
	});
}

async function runTutorial(interaction, fromComponent = false) {
	const customIdBase = `rpg-tutorial:${interaction.id}`;
	let page = 0;
	const reply = {
		components: [buildTutorialPanel(page, customIdBase)],
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
	};
	let message;
	if (fromComponent) {
		await interaction.update(reply);
		message = interaction.message;
	} else {
		message = await sendInteractiveRpgReply(interaction, reply);
	}
	if (!message) return;

	const collector = message.createMessageComponentCollector({ time: 240_000 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(componentReply(notice(`${icon.forbidden} **Not Your Tutorial**`, 'Run `/rpg tutorial` to open your own guide.'), true));
		}
		if (!i.customId.startsWith(customIdBase)) return;

		const action = i.customId.split(':').at(-1);
		if (action === 'skip') {
			await rpg.markTutorialSkipped(i.guild.id, i.user.id);
			collector.stop('skipped');
			return i.update({
				components: [notice(`${icon.success} **Tutorial Skipped**`, 'You can reopen it anytime with `/rpg tutorial`.', color.success)]
			});
		}
		if (action === 'prev') page = Math.max(page - 1, 0);
		if (action === 'next') page = Math.min(page + 1, tutorialSteps.length - 1);
		if (action === 'finish') {
			await rpg.markTutorialCompleted(i.guild.id, i.user.id);
			collector.stop('completed');
			return i.update({
				components: [
					notice(
						`${icon.success} **Tutorial Complete**`,
						'You are ready to begin. Use `/rpg create`, then `/rpg adventure` when your character is made.',
						color.success
					)
				]
			});
		}

		return i.update({ components: [buildTutorialPanel(page, customIdBase)] });
	});
}

function buildTutorialOfferPanel(customIdBase) {
	return panel({
		accentColor: color.RPG,
		title: `${icon.info} **RPG Tutorial Available**`,
		subtitle: 'First time using Cadia RPG',
		sections: [
			'Cadia RPG has exploration, gear drops, boss gates, travel, ranks, and character IDs. The tutorial takes under a minute and shows what to do first.',
			`${icon.arrowRight} Starting it now will guide you through the full gameplay loop.`
		],
		buttons: [
			actionButton(`${customIdBase}:start`, 'Start Tutorial', ButtonStyle.Primary, icon.success),
			actionButton(`${customIdBase}:skip`, 'Skip', ButtonStyle.Secondary)
		],
		footer: `${icon.info} You can reopen this anytime with /rpg tutorial`
	});
}

function buildTutorialPanel(page, customIdBase) {
	const step = tutorialSteps[page];
	const isLast = page >= tutorialSteps.length - 1;
	return panel({
		accentColor: color.RPG,
		title: `${icon.info} **RPG Tutorial**`,
		subtitle: `${page + 1}/${tutorialSteps.length} - ${step.title}`,
		sections: [
			step.body.map((line) => `${icon.arrowRight} ${line}`).join('\n\n'),
			`${icon.objective} **Goal:** Understand the RPG loop well enough to progress without guessing.`
		],
		buttons: [
			actionButton(`${customIdBase}:prev`, 'Back', ButtonStyle.Secondary).setDisabled(page <= 0),
			actionButton(
				`${customIdBase}:${isLast ? 'finish' : 'next'}`,
				isLast ? 'Finish' : 'Next',
				isLast ? ButtonStyle.Success : ButtonStyle.Primary
			),
			actionButton(`${customIdBase}:skip`, 'Skip', ButtonStyle.Secondary)
		],
		footer: `${icon.clock} Tutorial expires after 4 minutes`
	});
}

async function adminPanel(interaction, subcommand) {
	if (!isDeveloper(interaction.user.id)) {
		return interaction.reply(
			componentReply(notice(`${icon.forbidden} **Developer Only**`, 'Only Cadia developers can use RPG admin tools.'), true)
		);
	}

	if (subcommand === 'find') {
		const user = interaction.options.getUser('user', true);
		const profile = await rpg.requireProfile(interaction.guild.id, user.id);
		return interaction.reply(componentReply(buildAdminProfilePanel(profile, user, 'Character ID Lookup'), true));
	}

	if (subcommand === 'inspect') {
		const profile = await rpg.getProfileByCharacterId(interaction.options.getString('id', true));
		return interaction.reply(componentReply(buildAdminProfilePanel(profile, `<@${profile.userId}>`, 'Character Inspection'), true));
	}

	if (subcommand === 'add-currency') {
		const currency = interaction.options.getString('currency', true);
		const amount = interaction.options.getInteger('amount', true);
		const profile = await rpg.adminAddCurrency(interaction.options.getString('id', true), currency, amount);
		return interaction.reply(
			componentReply(
				buildAdminProfilePanel(
					profile,
					`<@${profile.userId}>`,
					'Currency Adjusted',
					`${icon.success} Applied **${amount.toLocaleString()}** to **${titleCase(currency)}**.`
				),
				true
			)
		);
	}

	if (subcommand === 'add-item') {
		const result = await rpg.adminAddItem(
			interaction.options.getString('id', true),
			interaction.options.getString('item', true),
			interaction.options.getInteger('quantity') ?? 1
		);
		return interaction.reply(
			componentReply(
				buildAdminProfilePanel(
					result.profile,
					`<@${result.profile.userId}>`,
					'Item Added',
					`${icon.success} Added **${result.quantity}x ${formatItemName(result.item)}** to inventory.`
				),
				true
			)
		);
	}

	if (subcommand === 'wipe') {
		if (!interaction.options.getBoolean('confirm', true)) {
			return interaction.reply(
				componentReply(notice(`${icon.warning} **Wipe Cancelled**`, 'Set `confirm` to true to wipe this character.'), true)
			);
		}

		const { profile, result } = await rpg.adminWipeCharacter(interaction.options.getString('id', true));
		return interaction.reply(
			componentReply(
				notice(
					result.deletedCount ? `${icon.deleted} **Character Wiped**` : `${icon.warning} **No Character Wiped**`,
					result.deletedCount
						? `Deleted **${profile.name}** owned by <@${profile.userId}>.\nCharacter ID: \`${profile.characterId}\``
						: 'No matching character was deleted.',
					result.deletedCount ? color.warning : color.fail
				),
				true
			)
		);
	}

	if (subcommand === 'max') {
		const result = await rpg.adminMaxCharacter(interaction.options.getString('id', true));
		return interaction.reply(
			componentReply(
				buildAdminProfilePanel(
					result.profile,
					`<@${result.profile.userId}>`,
					'Character Maxed',
					[
						`${icon.success} Set Rank to **${result.rank}** and restored HP to full.`,
						`${icon.coin} Maxed gold and relic shards.`,
						`${icon.loot} Granted **${result.itemQuantity}x** of **${result.itemCount}** RPG items.`,
						`${icon.compass} Cleared all boss gates and moved character to the final region.`
					].join('\n')
				),
				true
			)
		);
	}

	if (subcommand === 'harlequin') return forceBossFight(interaction, 'harlequin');
	if (subcommand === 'boss') return forceBossFight(interaction, interaction.options.getString('boss', true));

	throw new rpg.RpgError('Unknown RPG admin action.');
}

async function forceBossFight(interaction, bossId) {
	const { profile } = await rpg.prepareBossFight(interaction.guild.id, interaction.user.id);
	const encounter = rpg.getBossById(bossId);
	return bossAdventure(interaction, {
		profile,
		encounter,
		region: regionForEncounter(encounter.id) || regions[profile.region] || regions['broken-gate']
	});
}

async function showProfile(interaction) {
	await interaction.deferReply();
	const user = interaction.options.getUser('user') || interaction.user;
	const profile = await rpg.requireProfile(interaction.guild.id, user.id);
	await interaction.editReply({
		...componentReply(buildProfilePanel(profile, user)),
		files: [createProfileImageAttachment()]
	});
	const message = await interaction.fetchReply();
	const collector = message.createMessageComponentCollector({ time: 120_000 });

	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${icon.forbidden} **Not Your Profile**`, 'Run `/rpg profile` to open your own profile actions.'), true)
			);
		}

		if (!i.customId.startsWith('rpg-profile:')) return;
		const [, characterId, action] = i.customId.split(':');
		if (characterId !== profile.characterId) return;
		await handleProfileAction(i, action, characterId);
	});
}

async function showCharacterId(interaction) {
	const profile = await rpg.requireProfile(interaction.guild.id, interaction.user.id);
	return interaction.reply(
		componentReply(
			panel({
				accentColor: color.RPG,
				title: `${icon.info} **RPG Character ID**`,
				subtitle: profile.name,
				sections: [
					`${icon.person} **Owner:** ${interaction.user}`,
					`${icon.info} **Character ID:** \`${profile.characterId}\``,
					`${icon.arrowRight} Use this ID with developer tools or when asking staff to inspect your RPG character.`
				],
				footer: `${icon.clock} Requested <t:${Math.floor(Date.now() / 1000)}:R>`
			}),
			true
		)
	);
}

async function showQuest(interaction) {
	const profile = await rpg.requireProfile(interaction.guild.id, interaction.user.id);
	return openQuestBoard(interaction, profile);
}

async function openQuestBoard(interaction, profile, ephemeral = false) {
	const customIdBase = `rpg-quest:${interaction.id}`;
	const response = await interaction.reply({
		...(await buildQuestReply(profile, customIdBase, ephemeral)),
		withResponse: true
	});
	const message = response.resource?.message ?? (await interaction.fetchReply?.().catch(() => null));
	if (!message) return;

	const collector = message.createMessageComponentCollector({ time: 120_000 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${icon.forbidden} **Not Your Quest**`, 'Open your own RPG quest board to use these controls.'), true)
			);
		}
		if (!i.customId.startsWith(customIdBase)) return;

		try {
			await i.deferUpdate();
			const action = i.customId.split(':').at(-1);
			let nextProfile = await rpg.requireProfile(i.guild.id, i.user.id);

			if (action === 'accept') {
				const questId = i.customId.split(':').at(-2);
				const state = await rpg.acceptQuest(i.guild.id, i.user.id, questId);
				nextProfile = state.profile;
			} else if (action === 'claim') {
				const result = await rpg.claimQuestReward(i.guild.id, i.user.id);
				return i.editReply(await buildQuestRewardReply(result, customIdBase, ephemeral));
			}

			return i.editReply(await buildQuestReply(nextProfile, customIdBase, ephemeral));
		} catch (error) {
			return sendRpgIssue(i, error);
		}
	});

	collector.on('end', async () => {
		const latestProfile = await rpg.requireProfile(interaction.guild.id, interaction.user.id).catch(() => profile);
		await interaction.editReply(await buildQuestReply(latestProfile, customIdBase, ephemeral, true)).catch(() => null);
	});
}

async function travel(interaction) {
	await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	const profile = await rpg.requireProfile(interaction.guild.id, interaction.user.id);
	const region = regions[interaction.options.getString('region', true)];
	const gate = rpg.canTravel(profile, region);

	if (!gate.ok) {
		return interaction.editReply(componentReply(buildLockedRegionPanel(profile, region, gate), true));
	}

	const result = await rpg.travel(interaction.guild.id, interaction.user.id, region.id);
	return interaction.editReply(buildTravelCompleteReply(result, true));
}

async function adventure(interaction) {
	const activeAction = getActiveRpgAction(interaction);
	if (activeAction) return replyActiveRpgAction(interaction, activeAction);

	setActiveRpgAction(interaction, 'exploring');
	await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
	let result;
	let battleId;

	try {
		result = await rpg.startAdventure(interaction.guild.id, interaction.user.id);
		const exploration = explorationScene(result.region.id, result.encounter.name);

		battleId = `rpg:${interaction.id}:${result.encounter.id}`;
		await interaction.editReply({
			...componentReply(buildExplorationPanel(result.profile, result.encounter, result.region, battleId, result.recoveredHp, exploration)),
			files: exploration.attachment ? [exploration.attachment] : []
		});
	} catch (error) {
		clearActiveRpgAction(interaction);
		throw error;
	}

	const responseMessage = await interaction.fetchReply();
	let discovered = false;
	let resolvedFight = false;
	const collector = responseMessage.createMessageComponentCollector({ time: 120_000 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${icon.forbidden} **Not Your Encounter**`, 'Only the active Warden can resolve this encounter.'), true)
			);
		}

		try {
			if (i.customId === `${battleId}:continue`) {
				await i.deferUpdate();
				discovered = true;
				setActiveRpgAction(interaction, 'battle');
				return i.editReply(await buildEncounterReply(result.profile, result.encounter, result.region, battleId));
			}

			if (!discovered) return;
			await i.deferUpdate();
			const stance = i.customId.split(':').at(-1);
			const resolved = await rpg.resolveAdventure(interaction.guild.id, interaction.user.id, result.encounter.id, stance);
			resolvedFight = true;
			collector.stop('resolved');
			return i.editReply(buildBattleResultReply(resolved, stance));
		} catch (error) {
			return sendRpgIssue(i, error);
		}
	});

	collector.on('end', async (collected) => {
		clearActiveRpgAction(interaction);
		if (resolvedFight) return;
		await interaction
			.editReply({
				components: [
					notice(
						discovered ? `${icon.clock} **Encounter Faded**` : `${icon.clock} **Trail Went Quiet**`,
						discovered
							? `${result.encounter.name} vanished back into ${result.region.name}. Start another adventure when ready.`
							: `${result.region.name} fell silent before the encounter began. Start another adventure when ready.`,
						color.warning
					)
				]
			})
			.catch(() => null);
	});
}

async function bossAdventure(interaction, result) {
	const activeAction = getActiveRpgAction(interaction);
	if (activeAction) return replyActiveRpgAction(interaction, activeAction);

	setActiveRpgAction(interaction, 'battle');
	await interaction.deferReply();

	const state = {
		encounterId: result.encounter.id,
		enemyHp: result.encounter.hp,
		playerHp: result.profile.hp,
		turn: 0,
		lastResult: null
	};
	const battleId = `rpg-boss:${interaction.id}:${result.encounter.id}`;
	let responseMessage;
	try {
		responseMessage = await interaction.editReply(await buildBossBattleReply(result.profile, result.encounter, result.region, state, battleId));
	} catch (error) {
		clearActiveRpgAction(interaction);
		throw error;
	}
	const collector = responseMessage.createMessageComponentCollector({ time: 180_000 });

	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(componentReply(notice(`${icon.forbidden} **Not Your Boss Fight**`, 'Only the active Warden can fight this boss.'), true));
		}
		if (!i.customId.startsWith(battleId)) return;

		try {
			await i.deferUpdate();
			const stance = i.customId.split(':').at(-1);
			const resolved = await rpg.resolveAdventureTurn(interaction.guild.id, interaction.user.id, state, stance);
			state.enemyHp = resolved.enemyHp;
			state.playerHp = resolved.playerHp;
			state.turn += 1;
			state.lastResult = { ...resolved, stance };

			if (resolved.done) collector.stop(resolved.won ? 'won' : 'lost');
			if (resolved.done) return i.editReply(buildBattleResultReply(resolved, stance));
			return i.editReply(await buildBossBattleReply(resolved.profile, resolved.encounter, result.region, state, battleId));
		} catch (error) {
			return sendRpgIssue(i, error);
		}
	});

	collector.on('end', async (_, reason) => {
		clearActiveRpgAction(interaction);
		if (reason === 'won' || reason === 'lost') return;
		await interaction
			.editReply({
				components: [
					notice(
						`${icon.clock} **Boss Fight Faded**`,
						`${result.encounter.name} vanished into the dungeon dark. Start another adventure when ready.`,
						color.warning
					)
				],
				files: []
			})
			.catch(() => null);
	});
}

async function buildBossBattleReply(profile, encounter, region, state, battleId, disabled = false) {
	const fileName = `${encounter.id}-battle-${state.turn}.png`;
	const attachment = await createBossBattleCard({
		encounter,
		enemyHp: state.enemyHp,
		playerHp: state.playerHp,
		playerMaxHp: profile.maxHp,
		playerName: profile.name,
		fileName
	});
	const container = buildBossBattlePanel(profile, encounter, region, state, battleId, fileName, disabled);

	return {
		components: [container],
		files: [attachment],
		flags: MessageFlags.IsComponentsV2
	};
}

async function inventory(interaction) {
	const user = interaction.options.getUser('user') || interaction.user;
	const profile = await rpg.requireProfile(interaction.guild.id, user.id);
	if (user.id !== interaction.user.id) {
		const reply = await buildInventoryReply(profile, {
			categoryIndex: 0,
			customIdBase: `rpg-inventory-view:${interaction.id}`,
			disabled: true
		});
		return interaction.reply({ ...reply, flags: MessageFlags.IsComponentsV2 });
	}
	return openInventory(interaction, profile);
}

async function equip(interaction) {
	const result = await rpg.equip(interaction.guild.id, interaction.user.id, interaction.options.getString('item', true));
	return interaction.reply(componentReply(buildEquippedPanel(result), true));
}

async function openInventory(interaction, profile) {
	const customIdBase = `rpg-inventory:${interaction.id}`;
	const state = { categoryIndex: 0, customIdBase, pendingItemId: null, disabled: false };
	const initialReply = await buildInventoryReply(profile, state);
	const response = await interaction.reply({ ...initialReply, flags: MessageFlags.IsComponentsV2, withResponse: true });
	const message = response.resource?.message ?? (await interaction.fetchReply?.().catch(() => null));
	if (!message) return;

	const collector = message.createMessageComponentCollector({ time: 180_000 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${icon.forbidden} **Not Your Inventory**`, 'Open your own RPG inventory to use these controls.'), true)
			);
		}
		if (!i.customId.startsWith(customIdBase)) return;

		try {
			await i.deferUpdate();
			let nextProfile = await rpg.requireProfile(i.guild.id, i.user.id);
			const action = i.customId.split(':').at(-1);

			if (action === 'prev') {
				state.categoryIndex = (state.categoryIndex - 1 + inventoryCategories.length) % inventoryCategories.length;
				state.pendingItemId = null;
			} else if (action === 'next') {
				state.categoryIndex = (state.categoryIndex + 1) % inventoryCategories.length;
				state.pendingItemId = null;
			} else if (action === 'select') {
				state.pendingItemId = i.values[0];
			} else if (action === 'cancel') {
				state.pendingItemId = null;
			} else if (action === 'confirm' && state.pendingItemId) {
				const item = items[state.pendingItemId];
				const result =
					item?.slot === 'consumable'
						? await rpg.useItem(i.guild.id, i.user.id, state.pendingItemId)
						: await rpg.equip(i.guild.id, i.user.id, state.pendingItemId);
				nextProfile = result.profile;
				state.pendingItemId = null;
			}

			return i.editReply(await buildInventoryReply(nextProfile, state));
		} catch (error) {
			return sendRpgIssue(i, error);
		}
	});

	collector.on('end', async () => {
		state.disabled = true;
		const latestProfile = await rpg.requireProfile(interaction.guild.id, interaction.user.id).catch(() => profile);
		await interaction.editReply(await buildInventoryReply(latestProfile, state)).catch(() => null);
	});
}

async function handleProfileAction(interaction, action, characterId) {
	const profile = await rpg.getProfileByCharacterId(characterId);
	if (profile.userId !== interaction.user.id) {
		return interaction.reply(
			componentReply(notice(`${icon.forbidden} **Not Your Character**`, 'Only the character owner can use these actions.'), true)
		);
	}

	if (action === 'inventory') return openInventory(interaction, profile);
	if (action === 'quest') return openQuestBoard(interaction, profile, true);
	if (action === 'equip') return openEquipPicker(interaction, profile);
	if (action === 'travel') return openTravelPicker(interaction, profile);

	return interaction.reply(componentReply(notice(`${icon.warning} **Unknown Action**`, 'That profile action is no longer available.'), true));
}

async function openEquipPicker(interaction, profile) {
	const equipableEntries = getOwnedEquipableItems(profile);

	if (!equipableEntries.length) {
		return interaction.reply(
			componentReply(notice(`${icon.equipment} **No Gear Available**`, 'This character has no equipable weapons, armor, or charms yet.'), true)
		);
	}

	const customId = `rpg-profile:${profile.characterId}:equip-select`;
	const response = await interaction.reply({
		components: [buildEquipPickerPanel(profile, equipableEntries, customId)],
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
		withResponse: true
	});
	const message = response.resource?.message;
	if (!message) return;

	const collector = message.createMessageComponentCollector({ time: 60_000, max: 1 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(componentReply(notice(`${icon.forbidden} **Not Your Picker**`, 'Open your own RPG profile to equip items.'), true));
		}

		try {
			const result = await rpg.equip(i.guild.id, i.user.id, i.values[0]);
			return i.update({ components: [buildEquippedPanel(result)] });
		} catch (error) {
			return sendRpgIssue(i, error);
		}
	});
}

async function openTravelPicker(interaction, profile) {
	const travelRegions = Object.values(regions);
	const customId = `rpg-profile:${profile.characterId}:travel-select`;
	const response = await interaction.reply({
		components: [buildTravelPickerPanel(profile, travelRegions, customId)],
		flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
		withResponse: true
	});
	const message = response.resource?.message;
	if (!message) return;

	const collector = message.createMessageComponentCollector({ time: 60_000, max: 1 });
	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(componentReply(notice(`${icon.forbidden} **Not Your Picker**`, 'Open your own RPG profile to travel.'), true));
		}

		try {
			await i.deferUpdate();
			const selectedRegion = regions[i.values[0]];
			const gate = rpg.canTravel(profile, selectedRegion);
			if (!gate.ok) return i.editReply({ components: [buildLockedRegionPanel(profile, selectedRegion, gate)] });

			const result = await rpg.travel(i.guild.id, i.user.id, selectedRegion.id);
			return i.editReply(buildTravelCompleteReply(result, true));
		} catch (error) {
			return sendRpgIssue(i, error);
		}
	});
}

async function leaderboard(interaction) {
	const state = { type: 'level', page: 0 };
	const customIdBase = `rpg-lb:${interaction.id}`;
	await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
	const message = await interaction.editReply(await buildLeaderboardReply(interaction, state, customIdBase));
	const collector = message.createMessageComponentCollector({ time: 180_000 });

	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${icon.forbidden} **Not Your Leaderboard**`, 'Run `/rpg leaderboard` to open your own panel.'), true)
			);
		}

		if (!i.customId.startsWith(customIdBase)) return;

		await i.deferUpdate();

		const action = i.customId.split(':').at(-1);
		if (action === 'type') {
			state.type = i.values[0];
			state.page = 0;
		}
		if (action === 'prev') state.page = Math.max(state.page - 1, 0);
		if (action === 'next') state.page += 1;

		await interaction.editReply(await buildLeaderboardReply(interaction, state, customIdBase));
	});

	collector.on('end', async () => {
		await interaction.editReply(await buildLeaderboardReply(interaction, state, customIdBase, true)).catch(() => null);
	});
}

async function bestiary(interaction) {
	const customIdBase = `rpg-bestiary:${interaction.id}`;
	const response = await interaction.reply({
		components: [buildBestiaryPanel(customIdBase)],
		flags: MessageFlags.IsComponentsV2,
		withResponse: true
	});
	const message = response.resource?.message ?? (await interaction.fetchReply());
	const collector = message.createMessageComponentCollector({ time: 180_000 });

	collector.on('collect', async (i) => {
		if (i.user.id !== interaction.user.id) {
			return i.reply(
				componentReply(notice(`${icon.forbidden} **Not Your Bestiary**`, 'Run `/rpg bestiary` to open your own enemy guide.'), true)
			);
		}
		if (!i.customId.startsWith(customIdBase)) return;

		const selectedId = i.values[0];
		return i.update({ components: [buildBestiaryPanel(customIdBase, selectedId)] });
	});

	collector.on('end', async () => {
		await interaction.editReply({ components: [buildBestiaryPanel(customIdBase, null, true)] }).catch(() => null);
	});
}

async function buildLeaderboardReply(interaction, state, customIdBase, disabled = false) {
	const allLeaders = await rpg.leaderboard(interaction.guild.id, state.type);
	const totalPages = Math.max(Math.ceil(allLeaders.length / leaderboardPageSize), 1);
	state.page = Math.min(Math.max(state.page, 0), totalPages - 1);

	const pageLeaders = allLeaders.slice(state.page * leaderboardPageSize, (state.page + 1) * leaderboardPageSize);
	const selectedType = leaderboardTypes.find((type) => type.id === state.type) ?? leaderboardTypes[0];
	const fileName = `rpg-leaderboard-${state.type}-${state.page + 1}.png`;
	const attachment = await createRpgLeaderboardCard({
		guildName: interaction.guild.name,
		leaders: pageLeaders,
		type: state.type,
		page: state.page,
		totalPages,
		fileName,
		resolveUser: (userId) => interaction.client.users.cache.get(userId)
	});

	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${icon.leaderboard} **RPG Leaderboard**\n` +
					`-# ${interaction.guild.name} - ${selectedType.label} standings - ${allLeaders.length} registered Wardens`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${icon.info} Showing **${selectedType.label}** leaderboard page **${state.page + 1}/${totalPages}**.`
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${customIdBase}:type`)
					.setPlaceholder('Choose leaderboard type')
					.setDisabled(disabled)
					.addOptions(
						leaderboardTypes.map((type) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(type.label)
								.setDescription(type.description)
								.setValue(type.id)
								.setDefault(type.id === state.type)
						)
					)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				actionButton(`${customIdBase}:prev`, 'Previous', ButtonStyle.Secondary).setDisabled(disabled || state.page <= 0),
				actionButton(`${customIdBase}:next`, 'Next', ButtonStyle.Secondary).setDisabled(disabled || state.page >= totalPages - 1)
			)
		);

	return {
		components: [container],
		files: [attachment],
		flags: MessageFlags.IsComponentsV2
	};
}

async function deleteCharacter(interaction) {
	const result = await rpg.deleteProfile(interaction.guild.id, interaction.user.id);
	return interaction.reply(
		componentReply(
			panel({
				accentColor: result.deletedCount ? color.warning : color.fail,
				title: result.deletedCount ? `${icon.deleted} **Character Deleted**` : `${icon.warning} **No Character Found**`,
				sections: [
					result.deletedCount
						? `${icon.info} Your RPG profile was removed from this server.`
						: `${icon.info} You do not have an RPG profile to delete.`
				],
				footer: `${icon.person} Requested by ${interaction.user.displayName}`
			}),
			true
		)
	);
}

async function buildQuestReply(profile, customIdBase = 'rpg-quest:static', ephemeral = false, disabled = false) {
	const region = regions[profile.region];
	const state = rpg.getQuestState(profile);
	const quest = state.quest || state.availableQuest;
	const activeQuest = state.activeQuest;
	const questText = quest
		? questPageText(quest, activeQuest)
		: 'No NPC quest is available in this region yet. Travel onward or check back after clearing more gates.';
	const fileName = `rpg-quest-${profile.characterId}.png`;
	const attachment = await createQuestPageCard({
		profile,
		region,
		questText,
		rewards: quest?.rewards || null,
		questIndex: Math.max(profile.questStep || 0, 0),
		totalQuests: npcQuests.length,
		fileName
	});
	const portrait = quest ? npcPortrait(quest.npc?.portrait) : null;
	const files = [attachment, portrait?.attachment].filter(Boolean);
	const header = new TextDisplayBuilder().setContent(
		quest
			? `${icon.objective} **${quest.title}**\n-# ${quest.npc.name} - ${quest.npc.role}`
			: `${icon.objective} **Quest Board**\n-# ${region.name}`
	);
	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatQuestStatus(profile, state)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				disabled ? `-# Quest controls expired. Run \`/rpg quest\` again.` : `-# Quest controls expire after 2 minutes.`
			)
		);

	if (portrait) {
		container.spliceComponents(
			0,
			0,
			new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(portrait.url))
		);
	} else {
		container.spliceComponents(0, 0, header);
	}

	if (quest && !activeQuest) {
		container.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				actionButton(`${customIdBase}:${quest.id}:accept`, 'Accept Quest', ButtonStyle.Primary, icon.success).setDisabled(disabled)
			)
		);
	} else if (quest && activeQuest?.status === 'ready') {
		container.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				actionButton(`${customIdBase}:${quest.id}:claim`, 'Return To NPC', ButtonStyle.Success, icon.objective).setDisabled(disabled)
			)
		);
	}

	return {
		components: [container],
		files,
		flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
	};
}

async function buildQuestRewardReply(result, customIdBase = 'rpg-quest:static', ephemeral = false) {
	const region = regions[result.quest.regionId] || regions[result.profile.region];
	const fileName = `rpg-quest-complete-${result.profile.characterId}.png`;
	const attachment = await createQuestPageCard({
		profile: result.profile,
		region,
		questText: `${result.quest.npc.name}: "${result.quest.completeText}"\n\nRewards claimed.`,
		rewards: result.rewards,
		questIndex: Math.max(result.profile.questStep || 0, 0),
		totalQuests: npcQuests.length,
		fileName
	});
	const portrait = npcPortrait(result.quest.npc?.portrait);
	const files = [attachment, portrait?.attachment].filter(Boolean);
	const header = new TextDisplayBuilder().setContent(`${icon.success} **Quest Complete**\n-# ${result.quest.npc.name} - ${result.quest.title}`);
	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.success.replace('#', ''), 16))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					`${icon.person} **NPC:** ${result.quest.npc.name}`,
					`${icon.loot} **Rewards:** ${formatQuestRewards(result.rewards)}`,
					`${icon.arrowRight} Run \`/rpg quest\` again when you want to accept the next NPC request.`
				].join('\n')
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Quest controls expire after 2 minutes.`));

	if (portrait) {
		container.spliceComponents(
			0,
			0,
			new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(portrait.url))
		);
	} else {
		container.spliceComponents(0, 0, header);
	}

	return {
		components: [container],
		files,
		flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0)
	};
}

function questPageText(quest, activeQuest) {
	if (!activeQuest) return `${quest.npc.name}: "${quest.intro}"\n\n${quest.objectiveText}`;
	if (activeQuest.status === 'ready')
		return `${quest.npc.name}: "You did it. Come back and let me pay what I promised."\n\nReturn to ${quest.npc.name} to claim your reward.`;
	return `${quest.npc.name}: "${quest.intro}"\n\n${quest.objectiveText}`;
}

function formatQuestStatus(profile, state) {
	const quest = state.quest || state.availableQuest;
	if (!quest) {
		return [
			`${icon.info} **No Open NPC Quest**`,
			`${icon.compass} Current Region: **${regions[profile.region]?.name || profile.region}**`,
			`${icon.arrowRight} Use \`/rpg adventure\` to keep farming or \`/rpg travel\` when you unlock the next region.`
		].join('\n');
	}

	const activeQuest = state.activeQuest;
	const targetLines = (quest.targets || []).map((target) => {
		const encounter = rpg.getEncounterById(target.encounterId);
		const current = activeQuest?.progress?.mobKills?.[target.encounterId] || 0;
		return `${icon.arrowRight} **${encounter.name}:** ${Math.min(current, target.amount)}/${target.amount}`;
	});
	const rewardText = formatQuestRewards(quest.rewards);

	if (!activeQuest) {
		return [
			`${icon.person} **NPC:** ${quest.npc.name} - ${quest.npc.role}`,
			`${icon.compass} **Region:** ${regions[quest.regionId]?.name || quest.regionId}`,
			`${icon.objective} **Objective**\n${targetLines.join('\n')}`,
			`${icon.loot} **Reward:** ${rewardText}`,
			`${icon.arrowRight} Accept the quest, defeat the requested mobs with \`/rpg adventure\`, then return here.`
		].join('\n\n');
	}

	return [
		`${activeQuest.status === 'ready' ? icon.success : icon.objective} **${activeQuest.status === 'ready' ? 'Ready To Turn In' : 'Quest In Progress'}**`,
		`${icon.person} **Return NPC:** ${quest.npc.name}`,
		`${icon.objective} **Progress**\n${targetLines.join('\n')}`,
		`${icon.loot} **Reward:** ${rewardText}`,
		activeQuest.status === 'ready'
			? `${icon.arrowRight} Use **Return To NPC** to claim your reward.`
			: `${icon.arrowRight} Use \`/rpg adventure\` in **${regions[quest.regionId]?.name || quest.regionId}** to find the targets.`
	].join('\n\n');
}

function formatQuestRewards(rewards = {}) {
	const parts = [];
	if (rewards.gold) parts.push(`${icon.coin} ${rewards.gold.toLocaleString()} Gold`);
	if (rewards.xp) parts.push(`${icon.xpLabel} ${rewards.xp.toLocaleString()} XP`);
	if (rewards.shards) parts.push(`${icon.shards} ${rewards.shards.toLocaleString()} Shards`);
	for (const itemId of rewards.items || []) parts.push(formatItemName(items[itemId]) || titleCase(itemId));
	return parts.join(' | ') || 'None';
}

function buildInventoryPanel(profile, requestedBy) {
	const entries = profile.inventory || [];
	return panel({
		accentColor: color.default,
		title: `${icon.folder} **Inventory Satchel**`,
		subtitle: `${profile.name}'s carried gear`,
		image: sceneImages.inventory,
		sections: [
			entries.length
				? entries
						.map((entry, index) => {
							const item = items[entry.itemId];
							return `#${index + 1} **${item?.name ?? entry.itemId}** x${entry.quantity}\n-# ${item?.rarity ?? 'unknown'} ${item?.slot ?? 'item'} - ${item?.description ?? 'No notes.'}`;
						})
						.join('\n\n')
				: `${icon.info} This inventory is empty.`,
			formatEquipment(profile)
		],
		footer: `${icon.person} Requested by ${requestedBy}`
	});
}

async function buildInventoryReply(profile, state) {
	const category = inventoryCategories[state.categoryIndex] || inventoryCategories[0];
	const entries = inventoryEntriesForCategory(profile, category.id);
	const fileName = `rpg-inventory-${profile.characterId}-${category.id}.png`;
	const attachment = await createInventoryCard({ profile, category, entries, fileName });
	const selectedItem = state.pendingItemId ? items[state.pendingItemId] : null;
	const usableEntries = entries.filter(({ item, entry }) => item && (entry.quantity || 0) > 0);

	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${icon.folder} **Inventory Satchel**\n-# ${profile.name} - ${category.label} (${state.categoryIndex + 1}/${inventoryCategories.length})`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				selectedItem ? buildInventoryConfirmText(profile, selectedItem, category) : buildInventoryCategoryText(profile, entries, category)
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				actionButton(`${state.customIdBase}:prev`, 'Previous', ButtonStyle.Secondary).setDisabled(state.disabled),
				actionButton(`${state.customIdBase}:next`, 'Next', ButtonStyle.Secondary).setDisabled(state.disabled)
			)
		);

	if (usableEntries.length && !state.pendingItemId) {
		container.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${state.customIdBase}:select`)
					.setPlaceholder(`Choose ${category.action === 'use' ? 'an item to use' : 'gear to equip'}`)
					.setDisabled(state.disabled)
					.addOptions(
						usableEntries
							.slice(0, 25)
							.map(({ item, entry }) =>
								itemSelectOption(item, `${titleCase(item.rarity || 'common')} ${item.slot} - owned x${entry.quantity}`)
							)
					)
			)
		);
	}

	if (selectedItem) {
		container.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				actionButton(
					`${state.customIdBase}:confirm`,
					category.action === 'use' ? 'Use Item' : 'Equip Item',
					category.action === 'use' ? ButtonStyle.Success : ButtonStyle.Primary
				).setDisabled(state.disabled),
				actionButton(`${state.customIdBase}:cancel`, 'Cancel', ButtonStyle.Secondary).setDisabled(state.disabled)
			)
		);
	}

	container
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				state.disabled ? `-# Inventory controls expired. Run \`/rpg inventory\` again.` : `-# Inventory controls expire after 3 minutes.`
			)
		);

	return {
		components: [container],
		files: [attachment],
		flags: MessageFlags.IsComponentsV2
	};
}

function inventoryEntriesForCategory(profile, categoryId) {
	return (profile.inventory || [])
		.map((entry) => ({ entry, item: items[entry.itemId] }))
		.filter(({ item, entry }) => item?.slot === categoryId && (entry.quantity || 0) > 0);
}

function buildInventoryCategoryText(profile, entries, category) {
	const equipment = profile.equipment || {};
	const equippedItemId = category.action === 'equip' ? equipment[category.id] : null;
	const summary = entries.length
		? entries
				.slice(0, 8)
				.map(
					({ item, entry }) =>
						`${icon.arrowRight} **${formatItemName(item)}** x${entry.quantity}${equippedItemId === item.id ? ' - Equipped' : ''}`
				)
				.join('\n')
		: `${icon.info} No owned ${category.label.toLowerCase()} in this satchel.`;

	return [
		`${icon.equipment} **${category.label}**`,
		summary,
		'',
		category.action === 'use'
			? `${icon.info} Select an owned consumable, then confirm before using it.`
			: `${icon.info} Select owned gear, then confirm before equipping it.`
	].join('\n');
}

function buildInventoryConfirmText(profile, item, category) {
	const statText = formatStats(item.stats || {});
	return [
		`${icon.warning} **Confirm ${category.action === 'use' ? 'Use' : 'Equip'}**`,
		`**${formatItemName(item)}**`,
		`-# ${titleCase(item.rarity || 'common')} ${item.slot}`,
		item.description || 'No item notes available.',
		`${icon.settings} **Stats:** ${statText || 'None'}`,
		`${icon.arrowRight} Choose confirm to ${category.action === 'use' ? 'consume this item' : 'equip this gear'}.`
	].join('\n');
}

function buildTravelCompleteReply(result, ephemeral = false) {
	return {
		...componentReply(buildTravelCompletePanel(result), ephemeral),
		files: [createTravelImageAttachment()]
	};
}

function buildTravelCompletePanel(result) {
	const story = travelStory(result.region);
	return panel({
		accentColor: color.default,
		title: `${icon.compass} **Travel Complete**`,
		subtitle: `Now stationed in ${result.region.name}`,
		image: sceneImages.travel,
		sections: [
			story,
			[
				`${icon.chapter} **Chapter:** ${result.region.chapter}`,
				`${icon.level} **Unlocks at Rank:** ${result.region.unlockRank}`,
				`${icon.person} **Warden:** ${result.profile.name}`,
				`${icon.region} **Destination:** ${result.region.name}`
			]
		],
		footer: `${icon.clock} Region updated <t:${Math.floor(Date.now() / 1000)}:R>`
	});
}

function buildLockedRegionPanel(profile, region, gate) {
	const nextSteps = [];
	if (!region) {
		nextSteps.push('Choose a valid region from the `/rpg travel` region option.');
	} else if ((profile.level || 1) < region.unlockRank) {
		nextSteps.push(`Reach **Rank ${region.unlockRank}**. You are currently **Rank ${profile.level || 1}**.`);
		nextSteps.push('Use `/rpg adventure` to farm mobs for XP, gold, and gear.');
		nextSteps.push('Use `/rpg profile` to check your Rank progress.');
	} else if (gate.bossRequired) {
		const boss = rpg.getBossById(gate.bossId);
		nextSteps.push(`Defeat **${boss.name}** to unlock **${region.name}**.`);
		nextSteps.push(`Use \`/rpg boss-info boss:${boss.id}\` to study weaknesses and resistances.`);
		nextSteps.push('Farm region mobs with `/rpg adventure`, equip better gear with `/rpg equip`, then try `/rpg travel` again.');
	} else {
		nextSteps.push(gate.reason || 'This destination is not available yet.');
		nextSteps.push('Use `/rpg quest` for your current objective.');
	}

	return panel({
		accentColor: color.warning,
		title: `${icon.warning} **Travel Locked**`,
		subtitle: region ? region.name : 'Unknown Region',
		sections: [
			gate.reason || 'That region is locked right now.',
			`${icon.objective} **What to do next**\n${nextSteps.map((step) => `${icon.arrowRight} ${step}`).join('\n')}`
		],
		footer: `${icon.person} Warden ${profile.name}`
	});
}

function buildEquippedPanel(result) {
	return panel({
		accentColor: color.success,
		title: `${icon.success} **Item Equipped**`,
		subtitle: `${formatItemName(result.item)} moved into ${result.item.slot}`,
		sections: [
			`${icon.folder} **${formatItemName(result.item)}**\n${result.item.description}`,
			`${icon.settings} **Stats:** ${formatStats(result.item.stats)}`
		],
		footer: `${icon.person} Warden ${result.profile.name}`
	});
}

function buildEquipPickerPanel(profile, equipableEntries, customId) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(`${icon.equipment} **Equip Gear**\n-# Choose an owned item to equip for ${profile.name}.`)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(customId)
					.setPlaceholder('Choose gear to equip')
					.addOptions(
						equipableEntries
							.slice(0, 25)
							.map(({ entry, item }) => itemSelectOption(item, `${titleCase(item.rarity)} ${item.slot} - owned x${entry.quantity}`))
					)
			)
		);
}

function buildTravelPickerPanel(profile, travelRegions, customId) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${icon.compass} **Travel**\n-# Choose a destination for ${profile.name}. Locked regions explain how to unlock them.`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(customId)
					.setPlaceholder('Choose destination')
					.addOptions(
						travelRegions.slice(0, 25).map((region) =>
							new StringSelectMenuOptionBuilder()
								.setLabel(region.name)
								.setDescription(`Chapter ${region.chapter} - unlock rank ${region.unlockRank}`)
								.setValue(region.id)
								.setDefault(region.id === profile.region)
						)
					)
			)
		);
}

function buildBestiaryPanel(customIdBase, selectedId = null, disabled = false) {
	const selected = selectedId ? encounterRecordById(selectedId) : null;
	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${icon.threat} **RPG Bestiary**\n-# Choose a boss or mob from the dropdowns to inspect stats, drops, and strategy.`
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${customIdBase}:boss`)
					.setPlaceholder('Choose a boss')
					.setDisabled(disabled)
					.addOptions(bestiaryOptions('boss', selectedId))
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${customIdBase}:mob`)
					.setPlaceholder('Choose a mob')
					.setDisabled(disabled)
					.addOptions(bestiaryOptions('mob', selectedId))
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(selected ? formatEnemyInfo(selected) : formatBestiaryIntro()))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				disabled ? `-# This bestiary panel expired. Run \`/rpg bestiary\` again.` : `-# Bestiary panel expires after 3 minutes.`
			)
		);

	return container;
}

function bestiaryOptions(type, selectedId) {
	const records = encounterRecords()
		.filter((record) => record.type === type)
		.slice(0, 25);
	return records.map((record) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(record.encounter.name)
			.setDescription(`${record.region.name} - ${record.encounter.hp.toLocaleString()} HP`)
			.setValue(record.encounter.id)
			.setDefault(record.encounter.id === selectedId)
	);
}

function formatBestiaryIntro() {
	const bosses = encounterRecords().filter((record) => record.type === 'boss').length;
	const mobs = encounterRecords().filter((record) => record.type === 'mob').length;
	return [
		`${icon.info} **Available Records**`,
		`${icon.threat} Bosses: **${bosses}**`,
		`${icon.warning} Mobs: **${mobs}**`,
		'',
		`${icon.arrowRight} Boss records help you plan gear for travel gates.`,
		`${icon.arrowRight} Mob records show what you can farm in each region.`
	].join('\n');
}

function formatEnemyInfo(record) {
	const encounter = record.encounter;
	const loot = encounter.loot?.length ? encounter.loot.map((itemId) => formatItemName(items[itemId]) || itemId).join(', ') : 'None';
	const roleText = record.type === 'boss' ? 'Travel gate boss' : 'Region mob';
	const actionText =
		record.type === 'boss'
			? `Use \`/rpg travel\` when you meet the Rank requirement to challenge this boss.`
			: `Use \`/rpg adventure\` in **${record.region.name}** to find this mob and farm its drops.`;

	return [
		`${record.type === 'boss' ? icon.threat : icon.warning} **${encounter.name}**`,
		`-# ${roleText} - ${record.region.name}`,
		[
			`${icon.health.full} **HP:** ${encounter.hp.toLocaleString()}`,
			`${icon.damageDealt || icon.threat} **Attack:** ${encounter.attack.toLocaleString()}`,
			`${icon.settings} **Defense:** ${encounter.defense.toLocaleString()}`,
			`${icon.xpLabel} **XP:** ${encounter.xp.toLocaleString()}`,
			`${icon.coin} **Gold:** ${encounter.gold[0].toLocaleString()}-${encounter.gold[1].toLocaleString()}`
		].join('\n'),
		`${icon.loot} **Drops:** ${loot}`,
		`${icon.success} **Weak To:** ${formatTraits(encounter.weaknesses)}`,
		`${icon.warning} **Resists:** ${formatTraits(encounter.strengths)}`,
		`${icon.info} **Field Notes:** ${encounter.strategy || defaultEnemyStrategy(record)}`,
		`${icon.arrowRight} ${actionText}`
	].join('\n\n');
}

function defaultEnemyStrategy(record) {
	if (record.type === 'boss') return 'Study its weaknesses, equip matching gear traits, then challenge the travel gate.';
	return 'Farm this mob for XP, gold, and gear drops before attempting the region boss.';
}

function encounterRecords() {
	return Object.entries(encounters).flatMap(([regionId, regionEncounters]) =>
		regionEncounters.map((encounter) => ({
			encounter,
			region: regions[regionId],
			type: encounter.boss ? 'boss' : 'mob'
		}))
	);
}

function regionForEncounter(encounterId) {
	return encounterRecordById(encounterId)?.region || null;
}

function encounterRecordById(encounterId) {
	return encounterRecords().find((record) => record.encounter.id === encounterId);
}

function getOwnedEquipableItems(profile) {
	return (profile.inventory || [])
		.map((entry) => ({ entry, item: items[entry.itemId], quantity: entry.quantity || 0 }))
		.filter(({ item, quantity }) => item && item.slot !== 'consumable' && quantity > 0);
}

function buildProfilePanel(profile, user) {
	const region = regions[profile.region];
	const archetype = classes[profile.classId];
	const stats = rpg.getEffectiveStats(profile);
	const rank = rankForLevel(profile.level);
	const nextLevel = profile.level + 1;
	return panel({
		accentColor: profileAccent(profile),
		title: `${icon.owner} **${archetype.name} Warden** - ${titleCase(profile.origin)}`,
		subtitle: `${profile.name} - ${rank.emoji} Rank ${rank.number}`,
		subtitle2: `Character ID: \`${profile.characterId}\``,
		image: sceneImages.profile,
		sections: [
			`${icon.level} **Level ${profile.level}** -> **Level ${nextLevel}**\n${icon.level} You are **${percentage(profile.xp, rpg.xpPerLevel)}** way there. Keep going, you'll reach **100%** soon!\n${icon.xpLabel} **${xpRemaining(profile)}XP** Remaining`,
			`**HP** ${profile.hp}/${profile.maxHp}\n${healthBar(profile.hp, profile.maxHp)} **${percentage(profile.hp, profile.maxHp)}**`,
			[
				`${icon.owner} **|** ${user} **-** \`${profile.characterId}\``,
				`${icon.region} **|** ${region.name}`,
				`${icon.coin} **|** **${profile.gold.toLocaleString()}** Gold`,
				`${icon.shards} **|** **${profile.relicShards.toLocaleString()}** Shards`
			],
			`${icon.settings} **Stats**\n${formatCompactStats(stats)}`,
			formatProfileEquipment(profile),
			`${profileFlavor(profile)}\n${icon.arrowRight} **Next Unlock:** ${nextUnlock(profile)}`
		],
		buttons: [
			actionButton(`rpg-profile:${profile.characterId}:inventory`, 'Inventory', ButtonStyle.Secondary, icon.folder),
			actionButton(`rpg-profile:${profile.characterId}:quest`, 'Quests', ButtonStyle.Secondary, icon.objective),
			actionButton(`rpg-profile:${profile.characterId}:equip`, 'Equip', ButtonStyle.Secondary, icon.equipment),
			actionButton(`rpg-profile:${profile.characterId}:travel`, 'Travel', ButtonStyle.Secondary, icon.compass)
		],
		footer: `${icon.clock} Last updated <t:${Math.floor(profile.updatedAt / 1000)}:R>`
	});
}

function buildExplorationPanel(profile, encounter, region, battleId, recoveredHp = 0, exploration) {
	const maxHp = rpg.getEffectiveMaxHp(profile);
	return panel({
		accentColor: color.RPG,
		title: `${icon.compass} **${region.name} Expedition**`,
		subtitle: `${profile.name} moves deeper into Chapter ${region.chapter}`,
		image: exploration?.image || sceneImages[region.id] || sceneImages.battle,
		sections: [
			exploration?.text || `${profile.name} presses deeper into ${region.name}.`,
			recoveredHp > 0
				? `${icon.health.full} **Recovered:** Camp rest restored **${recoveredHp.toLocaleString()} HP** before the expedition.`
				: `${icon.health.full} **Ready:** HP is full at **${percentage(profile.hp, maxHp)}**.`,
			`${icon.warning} Something is nearby. Continue forward to reveal the encounter.`
		],
		buttons: [actionButton(`${battleId}:continue`, 'Continue', ButtonStyle.Secondary, icon.arrowRight)],
		footer: `${icon.clock} Exploration expires in 2 minutes`
	});
}

async function buildEncounterReply(profile, encounter, region, battleId) {
	const fileName = `${encounter.id}-battle.png`;
	const attachment = hasEncounterBattleCard(encounter.id)
		? await createEncounterBattleCard({
				encounter,
				enemyHp: encounter.hp,
				playerHp: profile.hp,
				playerMaxHp: rpg.getEffectiveMaxHp(profile),
				playerName: profile.name,
				fileName
			})
		: null;

	return {
		components: [buildEncounterPanel(profile, encounter, region, battleId, attachment ? `attachment://${fileName}` : sceneImages.battle)],
		files: attachment ? [attachment] : [],
		flags: MessageFlags.IsComponentsV2
	};
}

function buildEncounterPanel(profile, encounter, region, battleId, image = sceneImages.battle) {
	return panel({
		accentColor: color.warning,
		title: `${icon.warning} **Encounter: ${encounter.name}**`,
		subtitle: `${region.name} - RNG combat`,
		image,
		sections: [
			`${icon.person} **${profile.name}** found movement beyond the trail. Choose how to respond.`,
			[
				`**Enemy HP:** ${healthBar(encounter.hp, encounter.hp)} ${encounter.hp}`,
				`${icon.threat} **Threat:** Attack ${encounter.attack} - Defense ${encounter.defense}`,
				`${icon.coin} **Reward Range:** ${encounter.gold[0]}-${encounter.gold[1]} gold`
			],
			`${icon.actions} **Actions**\nAttack is steady. Skill scales with Focus. Defend lowers incoming damage. Flee is safer with Speed.`
		],
		buttons: [
			actionButton(`${battleId}:attack`, 'Attack', ButtonStyle.Danger),
			actionButton(`${battleId}:skill`, classes[profile.classId].skill, ButtonStyle.Primary),
			actionButton(`${battleId}:defend`, 'Defend', ButtonStyle.Secondary),
			actionButton(`${battleId}:flee`, 'Flee', ButtonStyle.Secondary)
		],
		footer: `${icon.clock} Encounter expires in 90 seconds`
	});
}

function buildBossBattlePanel(profile, encounter, region, state, battleId, fileName, disabled = false) {
	const last = state.lastResult;
	const status = last
		? [
				`${icon.threat} **Damage Dealt:** ${last.damage}${last.crit ? ' (critical)' : ''}`,
				`${icon.warning} **Damage Taken:** ${last.enemyDamage}`,
				last.done
					? last.won
						? `${icon.success} **${encounter.name} has fallen.**`
						: `${icon.fail} **${profile.name} was forced back.**`
					: `${icon.info} Choose your next stance.`
			]
		: [`${icon.warning} **Boss Encounter:** ${encounter.name} blocks the only exit.`, `Fleeing is impossible. Fight until one side breaks.`];

	return new ContainerBuilder()
		.setAccentColor(Number.parseInt((state.enemyHp <= 0 ? color.success : color.RPG).replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${icon.warning} **Boss: ${encounter.name}**\n-# ${region.name} - live combat`))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				[
					...status,
					`${icon.health.full} **${profile.name}:** ${state.playerHp}/${profile.maxHp}`,
					`${icon.threat} **${encounter.name}:** ${state.enemyHp}/${encounter.hp}`
				].join('\n')
			)
		)
		.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				actionButton(`${battleId}:attack`, 'Attack', ButtonStyle.Danger).setDisabled(disabled),
				actionButton(`${battleId}:skill`, classes[profile.classId].skill, ButtonStyle.Primary).setDisabled(disabled),
				actionButton(`${battleId}:defend`, 'Defend', ButtonStyle.Secondary).setDisabled(disabled)
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Turn ${state.turn} - Boss fight expires after 3 minutes of no actions.`));
}

function buildBattleResultReply(result, stance) {
	const image = result.won ? battleResultImage(`${result.encounter.id}-defeat`) : null;
	return {
		components: [buildBattleResultPanel(result, stance, image?.url || sceneImages.battle)],
		files: image?.attachment ? [image.attachment] : [],
		flags: MessageFlags.IsComponentsV2
	};
}

function buildBattleResultPanel(result, stance, image = sceneImages.battle) {
	if (result.escaped) {
		return panel({
			accentColor: color.warning,
			title: `${icon.compass} **Clean Escape**`,
			subtitle: `${result.encounter.name} lost the trail`,
			image,
			sections: [
				`${icon.info} You withdrew from combat before the relic storm tightened.`,
				`HP remains ${healthBar(result.profile.hp, result.profile.maxHp)} **${percentage(result.profile.hp, result.profile.maxHp)}**.`
			],
			footer: `${icon.clock} Resolved <t:${Math.floor(Date.now() / 1000)}:R>`
		});
	}

	return panel({
		accentColor: result.won ? color.success : color.fail,
		title: result.won ? `${icon.success} **Encounter Cleared**` : `${icon.fail} **Encounter Lost**`,
		subtitle: `${result.encounter.name} - ${titleCase(stance)} stance`,
		image,
		sections: [
			[
				`${icon.damageDealt} **Damage Dealt:** ${result.damage}${result.crit ? ' (critical)' : ''}`,
				`${icon.damageTaken} **Damage Taken:** ${result.enemyDamage}`,
				`**HP:** ${healthBar(result.profile.hp, result.profile.maxHp)} ${percentage(result.profile.hp, result.profile.maxHp)}`
			],
			result.won
				? [
						`${icon.coin} **Gold:** +${result.gold}`,
						`${icon.xpLabel} **XP:** +${result.xp}`,
						`${icon.loot} **Loot:** ${result.loot ? formatItemName(items[result.loot]) : 'None'}`
					]
				: `${icon.info} No rewards were claimed. Regroup and try again.`
		],
		footer: `${icon.clock} Resolved <t:${Math.floor(Date.now() / 1000)}:R>`
	});
}

function formatEquipment(profile) {
	const equipment = profile.equipment || {};
	return `${icon.equipment} **Equipment**\nWeapon: **${formatItemName(items[equipment.weapon]) || 'None'}**\nArmor: **${formatItemName(items[equipment.armor]) || 'None'}**\nCharm: **${formatItemName(items[equipment.charm]) || 'None'}**`;
}

function formatProfileEquipment(profile) {
	const equipment = profile.equipment || {};
	return `${icon.equipment} **Equipment**\nWeapon: **${slotName(equipment.weapon)}**\nArmor: **${slotName(equipment.armor)}**\nCharm: **${slotName(equipment.charm)}**`;
}

function slotName(itemId) {
	return formatItemName(items[itemId]) || 'Empty Slot';
}

function formatItemName(item) {
	if (!item) return '';
	const itemIcon = item.emoji || icon.items[item.id] || '';
	return `${itemIcon ? `${itemIcon} ` : ''}${item.name}`;
}

function itemSelectOption(item, description) {
	const option = new StringSelectMenuOptionBuilder().setLabel(item.name).setDescription(description).setValue(item.id);
	const emoji = itemEmojiObject(item);
	if (emoji) option.setEmoji(emoji);
	return option;
}

function itemEmojiObject(item) {
	const emoji = item?.emoji || icon.items[item?.id];
	const match = /^<a?:([^:]+):(\d+)>$/.exec(emoji || '');
	if (!match) return null;
	return { name: match[1], id: match[2], animated: emoji.startsWith('<a:') };
}

function formatCompactStats(stats) {
	return `ATK **${stats.attack}** | DEF **${stats.defense}** | SPD **${stats.speed}**\nLCK **${stats.luck}** | FOCUS **${stats.focus}**`;
}

function xpRemaining(profile) {
	return Math.max(rpg.xpPerLevel - (profile.xp || 0), 0);
}

function nextUnlock(profile) {
	const nextRegion = Object.values(regions)
		.filter((region) => region.unlockRank > (profile.level || 1))
		.sort((a, b) => a.unlockRank - b.unlockRank)[0];
	if (nextRegion) return `${nextRegion.name} at Rank ${nextRegion.unlockRank}`;
	if ((profile.level || 1) < 2) return 'Weapons at Rank 2';
	return '+HP and core stats on your next rank up';
}

function profileFlavor(profile) {
	const origin = profile.origin;
	if (profile.level <= 1) return 'An inexperienced warden carrying more ambition than gold.';
	if (profile.level < 3) return `The ${titleCase(origin)} roads are beginning to remember this name.`;
	if (profile.relicShards > 0) return 'Relic storms bend a little slower when this warden enters the field.';
	return 'The cold streets have yet to break this warden.';
}

function profileAccent(profile) {
	if (profile.level >= 20) return '#d4af37';
	if (profile.level >= 12) return '#7c3aed';
	if (profile.level >= 7) return '#3b82f6';
	if (profile.level >= 3) return color.success;
	return '#80848e';
}

function buildAdminProfilePanel(profile, owner, title, note) {
	const inventoryCount = (profile.inventory || []).reduce((total, entry) => total + (entry.quantity || 0), 0);
	return panel({
		accentColor: color.RPG,
		title: `${icon.settings} **RPG Admin - ${title}**`,
		subtitle: 'Developer character control panel',
		sections: [
			note,
			[
				`${icon.info} **Character ID:** \`${profile.characterId}\``,
				`${icon.person} **Owner:** ${owner}`,
				`${icon.person} **User ID:** \`${profile.userId}\``,
				`${icon.person} **Name:** ${profile.name}`
			],
			[
				`${icon.level} **Level:** ${profile.level}`,
				`${icon.xpLabel} **XP:** ${profile.xp}/${rpg.xpPerLevel}`,
				`${icon.coin} **Gold:** ${profile.gold.toLocaleString()}`,
				`${icon.shards} **Relic Shards:** ${profile.relicShards.toLocaleString()}`
			],
			[
				`${icon.compass} **Region:** ${regions[profile.region]?.name ?? profile.region}`,
				`${icon.success} **Wins:** ${profile.battlesWon}`,
				`${icon.fail} **Losses:** ${profile.battlesLost}`,
				`${icon.equipment} **Inventory Items:** ${inventoryCount}`
			]
		],
		footer: `${icon.clock} Admin lookup <t:${Math.floor(Date.now() / 1000)}:R>`
	});
}

function formatStats(stats) {
	return Object.entries(stats)
		.map(([stat, amount]) => `${titleCase(stat)} **${amount}**`)
		.join(' - ');
}

function formatTraits(traits = []) {
	return traits.length ? traits.map((trait) => `\`${titleCase(trait)}\``).join(', ') : 'None recorded';
}

function explorationScene(regionId, encounterName) {
	const scenes = {
		'broken-gate': [
			{
				assetId: 'broken-gate-gatehouse-corridor',
				text: 'The cracked gatehouse groans above you as dust slips from the old stone. Your boots cross a corridor of broken doors, cold lanterns, and claw marks that look fresh.'
			},
			{
				assetId: 'broken-gate-market-arch',
				text: 'You pass through a collapsed market arch where torn banners scrape against iron railings. Somewhere deeper in the ruin, a loose tile clicks under something that is not you.'
			},
			{
				assetId: 'broken-gate-black-brick-street',
				text: 'The street narrows between abandoned black-brick homes. A window shutter taps once, then twice, and the relic storm pulls the air tight around your armor.'
			}
		],
		'ashwood-outskirts': [
			{
				assetId: 'ashwood-black-snow-trail',
				text: 'Ash leaves drift across the trail like black snow. The forest bends around you, every root curling away as if it knows where the next ambush waits.'
			},
			{
				assetId: 'ashwood-watch-post',
				text: 'You push through a half-buried watch post wrapped in living vines. Sap glows along the walls, and the brush ahead starts moving against the wind.'
			},
			{
				assetId: 'ashwood-hunter-camp',
				text: 'A ruined hunter camp sits under orange moss. The firepit is warm, the tracks are fresh, and something heavy snaps a branch beyond the trees.'
			}
		],
		'glassmine-depths': [
			{
				assetId: 'glassmine-reflection-wall',
				text: 'Your lantern catches a thousand reflections in the mine wall. Each step answers back a second late, until one echo keeps walking after you stop.'
			},
			{
				assetId: 'glassmine-crystal-bridge',
				text: 'You cross a bridge of pale crystal above a silent drop. Far below, a pickaxe rings against stone even though no miner is there.'
			},
			{
				assetId: 'glassmine-broken-carts',
				text: 'The tunnel opens into a chamber of broken carts and blue glass dust. The shards tremble first, then the dark between them begins to move.'
			}
		]
	};
	const options = scenes[regionId] || scenes['broken-gate'];
	const scene = options[Math.floor(Math.random() * options.length)];
	const image = scene.assetId ? adventureStoryImage(scene.assetId) : null;
	return {
		attachment: image?.attachment,
		image: image?.url,
		text: `${scene.text}\n\n${icon.threat} **Encounter Stirring:** ${encounterName}`
	};
}

function travelStory(region) {
	const stories = [
		[
			`${icon.compass} **The road opens slowly.**`,
			`${region.name} does not appear all at once. ${region.description}`,
			'Your boots cross old borders, fresh dust, and quiet places where the relic storm has already passed.',
			`By the final mile, the signs all point toward **${region.name}**.`
		],
		[
			`${icon.compass} **You follow a half-buried route marker.**`,
			'The path bends through empty fields, broken stone, and stretches of silence where even the wind seems careful.',
			`${region.description}`,
			`When the terrain changes under your feet, you know you have reached **${region.name}**.`
		],
		[
			`${icon.compass} **The journey takes longer than the map promised.**`,
			'You pass ruined posts, cold campfires, and footprints that vanish whenever you look back.',
			`${region.description}`,
			`At last, the road gives way to **${region.name}**. Your next chapter begins here.`
		]
	];
	return stories[Math.floor(Math.random() * stories.length)].join('\n');
}

function progressBar(value, max) {
	const total = 8;
	const safeMax = Math.max(max, 1);
	const filled = Math.max(Math.min(Math.round((value / safeMax) * total), total), 0);
	return '━'.repeat(filled) + '─'.repeat(total - filled);
}

function percentage(value, max) {
	const safeMax = Math.max(max, 1);
	const safeValue = Math.max(Math.min(value, safeMax), 0);
	return `${Math.round((safeValue / safeMax) * 100)}%`;
}

function xpBar(value, max) {
	const safeMax = Math.max(max, 1);
	const safeValue = Math.max(Math.min(value, safeMax), 0);
	const percentage = safeValue / safeMax;
	const spriteIndex = Math.max(Math.min(Math.floor(percentage * 20), 20), 0);
	return icon.xp[spriteIndex] || progressBar(value, max);
}

function healthBar(value, max) {
	const totalHearts = 8;
	const safeMax = Math.max(max, 1);
	const safeValue = Math.max(Math.min(value, safeMax), 0);
	const filledUnits = Math.round((safeValue / safeMax) * totalHearts * 2);
	const fullHearts = Math.floor(filledUnits / 2);
	const hasHalfHeart = filledUnits % 2 === 1;
	const emptyHearts = Math.max(totalHearts - fullHearts - (hasHalfHeart ? 1 : 0), 0);

	return `${icon.health.full.repeat(fullHearts)}${hasHalfHeart ? icon.health.half : ''}${icon.health.empty.repeat(emptyHearts)}`;
}

function rankForLevel(level) {
	const bands = [
		{ min: 81, key: 'sss' },
		{ min: 71, key: 'ss' },
		{ min: 61, key: 's' },
		{ min: 51, key: 'a' },
		{ min: 41, key: 'b' },
		{ min: 31, key: 'c' },
		{ min: 21, key: 'd' },
		{ min: 11, key: 'e' },
		{ min: 1, key: 'f' }
	];
	const safeLevel = Math.max(Number(level) || 1, 1);
	const band = bands.find((entry) => safeLevel >= entry.min) || bands.at(-1);
	return {
		emoji: icon.rank[band.key],
		number: safeLevel - band.min + 1
	};
}

function titleCase(value) {
	return value
		.split(/[-_\s]+/)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(' ');
}

async function sendRpgIssue(interaction, error) {
	const expected = error instanceof rpg.RpgError;
	if (!expected) console.error(error);

	const response = componentReply(
		notice(
			expected ? `${icon.warning} **RPG Notice**` : `${icon.fail} **RPG Error**`,
			expected ? error.message : 'Something unexpected happened while running the RPG action. The issue was logged.',
			expected ? color.warning : color.fail
		),
		true
	);

	if (interaction.deferred || interaction.replied) return interaction.followUp(response).catch(() => null);
	return interaction.reply(response).catch(() => null);
}

function getActiveRpgAction(interaction) {
	const key = activeRpgActionKey(interaction);
	const action = activeRpgActions.get(key);
	if (!action) return null;

	if (action.expiresAt <= Date.now()) {
		activeRpgActions.delete(key);
		return null;
	}

	return action;
}

function setActiveRpgAction(interaction, type) {
	activeRpgActions.set(activeRpgActionKey(interaction), {
		type,
		expiresAt: Date.now() + (type === 'battle' ? 180_000 : 120_000)
	});
}

function clearActiveRpgAction(interaction) {
	activeRpgActions.delete(activeRpgActionKey(interaction));
}

function activeRpgActionKey(interaction) {
	return `${interaction.guild.id}:${interaction.user.id}`;
}

function replyActiveRpgAction(interaction, action) {
	const message =
		action.type === 'battle'
			? 'You are occupied in a battle and cannot run this command right now.'
			: 'You are already busy exploring. Finish your current expedition before starting another.';

	return interaction.reply(componentReply(notice(`${icon.warning} **RPG Busy**`, message, color.warning), true));
}

async function sendInteractiveRpgReply(interaction, payload) {
	if (interaction.deferred) return interaction.editReply(payload).catch(() => null);
	if (interaction.replied) {
		const response = await interaction.followUp({ ...payload, withResponse: true }).catch(() => null);
		return response?.resource?.message ?? null;
	}

	const response = await interaction.reply({ ...payload, withResponse: true }).catch((error) => {
		if (error?.code !== 40060) throw error;
		return null;
	});
	if (response?.resource?.message) return response.resource.message;
	if (interaction.deferred || interaction.replied) return interaction.fetchReply?.().catch(() => null);
	return null;
}

function rpgUnavailableReply() {
	return componentReply(
		notice(
			`${icon.warning} **RPG System Coming Soon**`,
			'The RPG System is currently unfinished and not available yet. It will return once the system is ready for testing.',
			color.warning
		),
		true
	);
}

function isDeveloper(userId) {
	return [process.env.DEVELOPERS, process.env.BOT_OWNERS]
		.flatMap((value) => String(value || '').split(/\s+/))
		.filter(Boolean)
		.includes(userId);
}

async function canUseRpg(userId) {
	return isDeveloper(userId) || (await rpg.hasRpgAccess(userId));
}

module.exports = {
	UserCommand
};
