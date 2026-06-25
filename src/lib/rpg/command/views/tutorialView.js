const { ButtonStyle } = require('discord.js');
const { commandMention } = require('../../../util/commandMentions');

const tutorialSteps = [
	{
		title: 'Create Your Warden',
		body: [
			`Start with ${commandMention('rpg create')} and choose a name, class, and origin.`,
			'Your class decides your starting stats and how your character grows when ranking up.',
			`Your character ID is your permanent RPG lookup code. You can get it with ${commandMention('rpg id')} or from ${commandMention('rpg profile')}.`
		]
	},
	{
		title: 'Read Your Profile',
		body: [
			`Use ${commandMention('rpg profile')} to check Rank, XP progress, HP condition, gold, shards, stats, and equipped gear.`,
			'Profile buttons open Inventory, Quests, Equip, and Travel without needing to remember every command.',
			'Stats come from your class plus whatever gear you equip.'
		]
	},
	{
		title: 'Explore For Encounters',
		body: [
			`Use ${commandMention('rpg adventure')} to explore your current region.`,
			'Adventures begin with a short story scene, then you continue forward to reveal a region mob.',
			'Normal adventures are for farming XP, gold, and gear. Bosses do not randomly appear there.'
		]
	},
	{
		title: 'Gear Matters',
		body: [
			'Defeated mobs can drop weapons, armor, charms, and consumables.',
			'If random drops fail, loot protection guarantees an item by every third mob victory.',
			`Use ${commandMention('rpg inventory')} to inspect what you own and ${commandMention('rpg equip')} to wear it.`,
			'Gear changes your effective stats. Some gear also has traits like steel, warded, pierce, flame, arcane, or crystal.'
		]
	},
	{
		title: 'Boss Gates And Travel',
		body: [
			`Use ${commandMention('rpg boss-info')} before attempting a boss. It shows HP, attack, defense, weaknesses, resistances, and drops.`,
			`When you reach the required Rank, use ${commandMention('rpg travel')} to attempt the boss gate for the next region.`,
			'If you lose, farm better gear from mobs, equip around the boss weakness, then try travel again.'
		]
	},
	{
		title: 'Progression Loop',
		body: [
			'The loop is: explore, win gear, equip smarter, rank up, study the boss, clear the boss gate, then travel onward.',
			'HP is restored when starting adventures and boss attempts, so a loss does not trap your character.',
			`Use ${commandMention('rpg quest')} when you need your next objective.`
		]
	}
];

function createTutorialView({ actionButton, color, icon, panel }) {
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
			footer: `${icon.info} You can reopen this anytime with ${commandMention('rpg tutorial')}`
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

	return { buildTutorialOfferPanel, buildTutorialPanel, tutorialSteps };
}

module.exports = { createTutorialView, tutorialSteps };
