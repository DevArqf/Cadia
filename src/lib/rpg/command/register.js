function registerRpgCommand(registry, description, { achievements, badges, classes, encounters, items, origins, regions }) {
	const adminBossChoices = Object.values(encounters)
		.flat()
		.filter((encounter) => encounter.boss)
		.map((encounter) => ({ name: encounter.name, value: encounter.id }));

	registry.registerChatInputCommand((builder) =>
		builder
			.setName('rpg')
			.setDescription(description)
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
					.addUserOption((option) => option.setName('user').setDescription('The user to inspect'))
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
					.addUserOption((option) => option.setName('user').setDescription('The user to inspect'))
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('equip')
					.setDescription('Equip an RPG item')
					.addStringOption((option) => option.setName('item').setDescription('The item to equip').setRequired(true).setAutocomplete(true))
			)
			.addSubcommand((subcommand) => subcommand.setName('leaderboard').setDescription('View the RPG leaderboard'))
			.addSubcommand((subcommand) => subcommand.setName('achievements').setDescription('View achievement progress and one-time rewards'))
			.addSubcommand((subcommand) =>
				subcommand
					.setName('badge')
					.setDescription('Choose a badge to display on your profile and character card')
					.addStringOption((option) =>
						option
							.setName('badge')
							.setDescription('An unlocked badge to feature')
							.setRequired(true)
							.addChoices(...Object.values(badges).map((badge) => ({ name: badge.name, value: badge.id })))
					)
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('share')
					.setDescription('Share your Warden or an achievement card')
					.addStringOption((option) =>
						option
							.setName('type')
							.setDescription('What to share')
							.setRequired(true)
							.addChoices({ name: 'Character', value: 'character' }, { name: 'Achievement', value: 'achievement' })
					)
					.addStringOption((option) =>
						option
							.setName('achievement')
							.setDescription('Achievement to share')
							.addChoices(...achievements.map((achievement) => ({ name: achievement.name, value: achievement.id })))
					)
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('server-boss')
					.setDescription('Join your server cooperative boss event')
					.addStringOption((option) =>
						option
							.setName('action')
							.setDescription('View or attack the cooperative boss')
							.setRequired(true)
							.addChoices({ name: 'View', value: 'view' }, { name: 'Attack', value: 'attack' })
					)
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('season')
					.setDescription('View or claim the current seasonal quest')
					.addStringOption((option) =>
						option
							.setName('action')
							.setDescription('View progress or claim the limited item and badge')
							.setRequired(true)
							.addChoices({ name: 'View', value: 'view' }, { name: 'Claim', value: 'claim' })
					)
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('refer')
					.setDescription('Share or redeem an RPG referral code')
					.addStringOption((option) =>
						option
							.setName('action')
							.setDescription('View your code or redeem a code')
							.setRequired(true)
							.addChoices({ name: 'My Code', value: 'code' }, { name: 'Redeem', value: 'redeem' })
					)
					.addStringOption((option) => option.setName('code').setDescription('Referral code to redeem'))
			)
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
									.addChoices(
										{ name: 'Gold', value: 'gold' },
										{ name: 'Relic Shards', value: 'shards' },
										{ name: 'XP', value: 'xp' },
										{ name: 'Level', value: 'level' }
									)
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
							.addIntegerOption((option) => option.setName('quantity').setDescription('How many to add').setMinValue(1).setMaxValue(99))
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
					.addSubcommand((subcommand) =>
						subcommand
							.setName('analytics')
							.setDescription('View developer analytics for the RPG system')
							.addStringOption((option) =>
								option
									.setName('view')
									.setDescription('The analytics report to open')
									.addChoices(
										{ name: 'Summary', value: 'summary' },
										{ name: 'Progression', value: 'progression' },
										{ name: 'Combat', value: 'combat' },
										{ name: 'Economy', value: 'economy' },
										{ name: 'Leaders', value: 'leaders' },
										{ name: 'Content', value: 'content' },
										{ name: 'Player Growth', value: 'growth' }
									)
							)
					)
			)
	);
}

function titleCase(value) {
	return value
		.split(/[-_\s]+/)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(' ');
}

module.exports = {
	registerRpgCommand
};
