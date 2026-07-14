const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../../config');
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
const { commandMention } = require('../../../lib/util/commandMentions');
const {
	adventureStoryImage,
	battleResultImage,
	createCharacterCreationImageAttachment,
	createProfileImageAttachment,
	createTravelImageAttachment,
	fleeResultImage,
	npcPortrait,
	sceneImages,
	serverBossImage
} = require('../../../lib/rpg/assets');
const { createBossBattleCard, createEncounterBattleCard, hasEncounterBattleCard } = require('../../../lib/rpg/battleCanvas');
const { badges, classes, encounters, items, npcQuests, origins, regions } = require('../../../lib/rpg/data');
const { createInventoryCard } = require('../../../lib/rpg/inventoryCanvas');
const { createRpgLeaderboardCard } = require('../../../lib/rpg/leaderboardCanvas');
const { createQuestPageCard } = require('../../../lib/rpg/questCanvas');
const { createSeasonCard } = require('../../../lib/rpg/seasonCanvas');
const { createDefeatStory } = require('../../../lib/rpg/defeatStory');
const growth = require('../../../lib/rpg/playerGrowth');
const { createAnalyticsView } = require('../../../lib/rpg/command/analyticsView');
const { createAdminHandlers } = require('../../../lib/rpg/command/adminHandlers');
const { createBattleFlow } = require('../../../lib/rpg/command/battleFlow');
const { createPlayerGrowthHandlers } = require('../../../lib/rpg/command/playerGrowthView');
const { registerRpgCommand } = require('../../../lib/rpg/command/register');
const { dispatchRpgCommand } = require('../../../lib/rpg/command/router');
const { clearActiveAction, getActiveAction, setActiveAction } = require('../../../lib/rpg/command/sessions');
const { createBattleView } = require('../../../lib/rpg/command/views/battleView');
const { createInventoryView } = require('../../../lib/rpg/command/views/inventoryView');
const { createProfileView } = require('../../../lib/rpg/command/views/profileView');
const { createTravelView } = require('../../../lib/rpg/command/views/travelView');
const { createTutorialView } = require('../../../lib/rpg/command/views/tutorialView');
const { createTutorialHandlers } = require('../../../lib/rpg/command/tutorialHandlers');
const { getInteractionSession, saveInteractionSession, updateInteractionSession } = require('../../../lib/runtime/interactionSessions');
const rpg = require('../../../lib/rpg/service');

const icon = {
	actions: emojis.custom.orbPurple || emojis.custom.rpgInfo || 'Actions',
	achievement: emojis.custom.tada2 || emojis.custom.cadia || 'Achievement',
	badge: emojis.custom.gem || emojis.custom.crown || 'Badge',
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
	settings: emojis.custom.rpgsettings || emojis.custom.rpgCogGold || emojis.custom.rpgCogSilver || 'Stats',
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
		gatebound_crest: emojis.custom.gateboundCrest || '',
		stormglass_aura: emojis.custom.stormglassAura || '',
		worldbreaker_sigil: emojis.custom.worldbreakerSigil || '',
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

const { buildTutorialOfferPanel, buildTutorialPanel, tutorialSteps } = createTutorialView({
	actionButton,
	color,
	icon,
	panel
});
const tutorialHandlers = createTutorialHandlers({
	buildTutorialOfferPanel,
	buildTutorialPanel,
	color,
	commandMention,
	componentReply,
	icon,
	notice,
	rpg,
	sendInteractiveRpgReply,
	tutorialSteps
});
const { offerTutorial, runTutorial } = tutorialHandlers;
const { buildEquipPickerPanel, buildEquippedPanel, buildInventoryPanel, buildInventoryReply, inventoryCategories, inventoryEntriesForCategory } =
	createInventoryView({
		actionButton,
		color,
		createInventoryCard,
		formatEquipment,
		formatItemName,
		formatStats,
		icon,
		itemSelectOption,
		items,
		panel,
		sceneImages,
		titleCase
	});
const { buildLockedRegionPanel, buildTravelCompletePanel, buildTravelCompleteReply, buildTravelPickerPanel } = createTravelView({
	actionButton,
	color,
	componentReply,
	createTravelImageAttachment,
	icon,
	panel,
	regions,
	sceneImages,
	service: rpg
});
const { buildAdminProfilePanel, buildProfilePanel } = createProfileView({
	actionButton,
	badges,
	classes,
	color,
	formatCompactStats,
	formatProfileEquipment,
	healthBar,
	icon,
	nextUnlock,
	panel,
	percentage,
	profileFlavor,
	rankForLevel,
	regions,
	sceneImages,
	service: rpg,
	titleCase,
	xpRemaining
});
const {
	buildBattleResultPanel,
	buildBattleResultReply,
	buildBossBattlePanel,
	buildBossBattleReply,
	buildEncounterPanel,
	buildEncounterReply,
	buildExplorationPanel,
	explorationScene
} = createBattleView({
	actionButton,
	adventureStoryImage,
	badges,
	battleResultImage,
	classes,
	color,
	createBossBattleCard,
	createDefeatStory,
	createEncounterBattleCard,
	fleeResultImage,
	formatItemName,
	hasEncounterBattleCard,
	healthBar,
	icon,
	inventoryQuantity,
	items,
	panel,
	percentage,
	sceneImages,
	service: rpg,
	titleCase
});
const buildRpgAnalyticsPanel = createAnalyticsView({ classes, color, icon, items, panel, regions, service: rpg, titleCase });
const battleFlow = createBattleFlow({
	buildBattleResultReply,
	buildBossBattleReply,
	buildEncounterReply,
	buildExplorationPanel,
	clearActiveAction: clearActiveRpgAction,
	color,
	componentReply,
	explorationScene,
	getActiveAction: getActiveRpgAction,
	icon,
	notice,
	replyActiveAction: replyActiveRpgAction,
	sendIssue: sendRpgIssue,
	service: rpg,
	setActiveAction: setActiveRpgAction
});
const playerGrowthHandlers = createPlayerGrowthHandlers({
	actionButton,
	color,
	componentReply,
	createRpgLeaderboardCard,
	createSeasonCard,
	growth,
	icon,
	notice,
	panel,
	serverBossImage,
	service: rpg
});
const { adminPanel } = createAdminHandlers({
	buildAdminProfilePanel,
	color,
	commandMention,
	componentReply,
	formatItemName,
	forceBossFight,
	icon,
	isDeveloper,
	notice,
	rpg,
	showRpgAnalytics,
	titleCase
});

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			defaultCooldown: 5,
			description: 'Play the Cadia story RPG'
		});
	}

	registerApplicationCommands(registry) {
		registerRpgCommand(registry, this.description, { badges, classes, encounters, items, origins, regions });
	}

	async chatInputRun(interaction) {
		try {
			if (shouldDeferRpgCommand(interaction) && !interaction.deferred && !interaction.replied) {
				await interaction.deferReply();
			}
			return await dispatchRpgCommand(
				interaction,
				{
					admin: adminPanel,
					offerTutorial,
					create: createCharacter,
					profile: showProfile,
					id: showCharacterId,
					tutorial: runTutorial,
					quest: showQuest,
					travel,
					adventure: battleFlow.adventure,
					inventory,
					equip,
					leaderboard: playerGrowthHandlers.leaderboard,
					achievements: playerGrowthHandlers.achievements,
					badge: playerGrowthHandlers.badge,
					'server-boss': playerGrowthHandlers.serverBoss,
					season: playerGrowthHandlers.season,
					refer: playerGrowthHandlers.refer,
					bestiary,
					items: itemGuide,
					delete: deleteCharacter
				},
				rpg
			);
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

	return interaction.reply({
		...componentReply(
			panel({
				accentColor: color.RPG,
				title: `${icon.leaderboard} **Warden Registered**`,
				subtitle: 'Chapter I - The Broken Gate',
				image: sceneImages.create,
				sections: [
					`${icon.person} **${profile.name}** has stepped into Cadia's relic storm.`,
					[
						`${icon.class} **Class:** ${classes[profile.classId].name}`,
						`${icon.region} **Origin:** ${titleCase(profile.origin)}`,
						`${icon.info} **Character ID:** \`${profile.characterId}\``,
						`${icon.coin} **Starting Gold:** ${profile.gold}`,
						`${icon.folder} **Starter Item:** Star Salve`
					],
					`${icon.info} Use ${commandMention('rpg adventure')} to begin your first encounter.`
				],
				footer: `${icon.clock} Created <t:${Math.floor(profile.createdAt / 1000)}:R>`
			})
		),
		files: [createCharacterCreationImageAttachment()]
	});
}

async function showRpgAnalytics(interaction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });
	const view = interaction.options.getString('view') || 'summary';
	const analytics = await rpg.adminAnalytics();
	return interaction.editReply(componentReply(buildRpgAnalyticsPanel(analytics, view), true));
}

async function forceBossFight(interaction, bossId) {
	const { profile } = await rpg.prepareBossFight(interaction.guild.id, interaction.user.id);
	const encounter = rpg.getBossById(bossId);
	return battleFlow.bossAdventure(interaction, {
		profile,
		encounter,
		region: regionForEncounter(encounter.id) || regions[profile.region] || regions['broken-gate']
	});
}

async function showProfile(interaction) {
	await interaction.deferReply();
	const user = interaction.options.getUser('user') || interaction.user;
	const [profile, playerGrowth] = await Promise.all([rpg.requireProfile(interaction.guild.id, user.id), growth.getPlayerGrowth(user.id)]);
	await interaction.editReply({
		...componentReply(buildProfilePanel(profile, user, playerGrowth)),
		files: [createProfileImageAttachment()]
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
	await saveInteractionSession({
		kind: 'rpg-quest',
		sessionId: interaction.id,
		ownerId: interaction.user.id,
		guildId: interaction.guild.id,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message.id,
		state: { ephemeral },
		ttlMs: 120_000
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
	await saveInteractionSession({
		kind: 'rpg-inventory',
		sessionId: interaction.id,
		ownerId: interaction.user.id,
		guildId: interaction.guild.id,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message.id,
		state,
		ttlMs: 180_000
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
	await saveInteractionSession({
		kind: 'rpg-profile-equip',
		sessionId: `${profile.characterId}:equip-select`,
		ownerId: interaction.user.id,
		guildId: interaction.guild.id,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message.id,
		state: { characterId: profile.characterId },
		ttlMs: 60_000
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
	await saveInteractionSession({
		kind: 'rpg-profile-travel',
		sessionId: `${profile.characterId}:travel-select`,
		ownerId: interaction.user.id,
		guildId: interaction.guild.id,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message.id,
		state: { characterId: profile.characterId },
		ttlMs: 60_000
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
	await saveInteractionSession({
		kind: 'rpg-bestiary',
		sessionId: interaction.id,
		ownerId: interaction.user.id,
		guildId: interaction.guildId || interaction.guild?.id || null,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message?.id || null,
		state: { selectedId: null },
		ttlMs: 180_000
	});
}

async function itemGuide(interaction) {
	const customIdBase = `rpg-items:${interaction.id}`;
	const response = await interaction.reply({
		components: [buildItemGuidePanel(customIdBase)],
		flags: MessageFlags.IsComponentsV2,
		withResponse: true
	});
	const message = response.resource?.message ?? (await interaction.fetchReply());
	await saveInteractionSession({
		kind: 'rpg-items',
		sessionId: interaction.id,
		ownerId: interaction.user.id,
		guildId: interaction.guildId || interaction.guild?.id || null,
		channelId: interaction.channelId || interaction.channel?.id || null,
		messageId: message?.id || null,
		state: { selectedId: null },
		ttlMs: 180_000
	});
}

async function handleRpgComponentInteraction(interaction) {
	const customId = interaction.customId || '';
	if (!customId.startsWith('rpg-')) return false;

	try {
		if (customId.startsWith('rpg-tutorial-offer:')) return tutorialHandlers.handleTutorialOfferInteraction(interaction, ensureRpgSessionOwner);
		if (customId.startsWith('rpg-tutorial:')) return tutorialHandlers.handleTutorialPageInteraction(interaction, ensureRpgSessionOwner);
		if (customId.startsWith('rpg-profile:')) return handleProfileComponentInteraction(interaction);
		if (customId.startsWith('rpg-quest:')) return handleQuestInteraction(interaction);
		if (customId.startsWith('rpg-inventory:')) return handleInventoryInteraction(interaction);
		if (customId.startsWith('rpg-bestiary:')) return handleBestiaryInteraction(interaction);
		if (customId.startsWith('rpg-items:')) return handleItemGuideInteraction(interaction);
	} catch (error) {
		await sendRpgIssue(interaction, error);
		return true;
	}

	return false;
}

async function handleRpgBattleInteraction(interaction) {
	return battleFlow.handleBattleInteraction(interaction);
}

async function handleRpgLeaderboardInteraction(interaction) {
	return playerGrowthHandlers.handleLeaderboardInteraction(interaction);
}

async function handleProfileComponentInteraction(interaction) {
	const [, characterId, action] = interaction.customId.split(':');
	const profile = await rpg.getProfileByCharacterId(characterId);
	if (profile.userId !== interaction.user.id) {
		await interaction.reply(componentReply(notice(`${icon.forbidden} **Not Your Character**`, 'Only the character owner can use these actions.'), true));
		return true;
	}

	if (action === 'equip-select') {
		const result = await rpg.equip(interaction.guild.id, interaction.user.id, interaction.values[0]);
		await interaction.update({ components: [buildEquippedPanel(result)] });
		return true;
	}

	if (action === 'travel-select') {
		await interaction.deferUpdate();
		const selectedRegion = regions[interaction.values[0]];
		const gate = rpg.canTravel(profile, selectedRegion);
		if (!gate.ok) {
			await interaction.editReply({ components: [buildLockedRegionPanel(profile, selectedRegion, gate)] });
			return true;
		}
		const result = await rpg.travel(interaction.guild.id, interaction.user.id, selectedRegion.id);
		await interaction.editReply(buildTravelCompleteReply(result, true));
		return true;
	}

	await handleProfileAction(interaction, action, characterId);
	return true;
}

async function handleQuestInteraction(interaction) {
	const parts = interaction.customId.split(':');
	const sessionId = parts[1];
	const action = parts.at(-1);
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;
	if (!(await ensureRpgSessionOwner(interaction, ownerId, 'Not Your Quest', 'Open your own RPG quest board to use these controls.'))) return true;

	await interaction.deferUpdate();
	let nextProfile = await rpg.requireProfile(interaction.guild.id, interaction.user.id);
	const ephemeral = Boolean(session?.state?.ephemeral);
	const customIdBase = `rpg-quest:${session?.sessionId || sessionId}`;

	if (action === 'accept') {
		const questId = parts.at(-2);
		const state = await rpg.acceptQuest(interaction.guild.id, interaction.user.id, questId);
		nextProfile = state.profile;
	} else if (action === 'claim') {
		const result = await rpg.claimQuestReward(interaction.guild.id, interaction.user.id);
		await interaction.editReply(await buildQuestRewardReply(result, customIdBase, ephemeral));
		return true;
	}

	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'rpg-quest',
		ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state: { ephemeral },
		ttlMs: 120_000
	});
	await interaction.editReply(await buildQuestReply(nextProfile, customIdBase, ephemeral));
	return true;
}

async function handleInventoryInteraction(interaction) {
	const [, sessionId, action] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;
	if (!(await ensureRpgSessionOwner(interaction, ownerId, 'Not Your Inventory', 'Open your own RPG inventory to use these controls.'))) return true;

	await interaction.deferUpdate();
	const state = {
		categoryIndex: Number(session?.state?.categoryIndex || 0),
		customIdBase: `rpg-inventory:${session?.sessionId || sessionId}`,
		pendingItemId: session?.state?.pendingItemId || null,
		disabled: false
	};
	let nextProfile = await rpg.requireProfile(interaction.guild.id, interaction.user.id);

	if (action === 'prev') {
		state.categoryIndex = (state.categoryIndex - 1 + inventoryCategories.length) % inventoryCategories.length;
		state.pendingItemId = null;
	} else if (action === 'next') {
		state.categoryIndex = (state.categoryIndex + 1) % inventoryCategories.length;
		state.pendingItemId = null;
	} else if (action === 'select') {
		state.pendingItemId = interaction.values[0];
	} else if (action === 'cancel') {
		state.pendingItemId = null;
	} else if (action === 'confirm' && state.pendingItemId) {
		const item = items[state.pendingItemId];
		const result =
			item?.slot === 'consumable'
				? await rpg.useItem(interaction.guild.id, interaction.user.id, state.pendingItemId)
				: await rpg.equip(interaction.guild.id, interaction.user.id, state.pendingItemId);
		nextProfile = result.profile;
		state.pendingItemId = null;
	}

	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'rpg-inventory',
		ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state,
		ttlMs: 180_000
	});
	await interaction.editReply(await buildInventoryReply(nextProfile, state));
	return true;
}

async function handleBestiaryInteraction(interaction) {
	const [, sessionId] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;
	if (!(await ensureRpgSessionOwner(interaction, ownerId, 'Not Your Bestiary', `Run ${commandMention('rpg bestiary')} to open your own enemy guide.`))) {
		return true;
	}

	const selectedId = interaction.values[0];
	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'rpg-bestiary',
		ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state: { selectedId },
		ttlMs: 180_000
	});
	await interaction.update({ components: [buildBestiaryPanel(`rpg-bestiary:${session?.sessionId || sessionId}`, selectedId)] });
	return true;
}

async function handleItemGuideInteraction(interaction) {
	const [, sessionId] = interaction.customId.split(':');
	const session = await getInteractionSession({ sessionId, messageId: interaction.message?.id });
	const ownerId = session?.ownerId || sessionId;
	if (!(await ensureRpgSessionOwner(interaction, ownerId, 'Not Your Item Guide', `Run ${commandMention('rpg items')} to open your own item guide.`))) {
		return true;
	}

	const selectedId = interaction.values[0];
	await updateInteractionSession(session?.sessionId || sessionId, {
		kind: 'rpg-items',
		ownerId,
		guildId: interaction.guildId || interaction.guild?.id || session?.guildId || null,
		channelId: interaction.channelId || interaction.channel?.id || session?.channelId || null,
		messageId: interaction.message?.id || session?.messageId || null,
		state: { selectedId },
		ttlMs: 180_000
	});
	await interaction.update({ components: [buildItemGuidePanel(`rpg-items:${session?.sessionId || sessionId}`, selectedId)] });
	return true;
}

async function ensureRpgSessionOwner(interaction, ownerId, title, message) {
	if (interaction.user.id === ownerId) return true;
	await interaction.reply(componentReply(notice(`${icon.forbidden} **${title}**`, message), true));
	return false;
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
				disabled ? `-# Quest controls expired. Run ${commandMention('rpg quest')} again.` : `-# Quest controls expire after 2 minutes.`
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
					`${icon.arrowRight} Run ${commandMention('rpg quest')} again when you want to accept the next NPC request.`
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
			`${icon.arrowRight} Use ${commandMention('rpg adventure')} to keep farming or ${commandMention('rpg travel')} when you unlock the next region.`
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
			`${icon.arrowRight} Accept the quest, defeat the requested mobs with ${commandMention('rpg adventure')}, then return here.`
		].join('\n\n');
	}

	return [
		`${activeQuest.status === 'ready' ? icon.success : icon.objective} **${activeQuest.status === 'ready' ? 'Ready To Turn In' : 'Quest In Progress'}**`,
		`${icon.person} **Return NPC:** ${quest.npc.name}`,
		`${icon.objective} **Progress**\n${targetLines.join('\n')}`,
		`${icon.loot} **Reward:** ${rewardText}`,
		activeQuest.status === 'ready'
			? `${icon.arrowRight} Use **Return To NPC** to claim your reward.`
			: `${icon.arrowRight} Use ${commandMention('rpg adventure')} in **${regions[quest.regionId]?.name || quest.regionId}** to find the targets.`
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
				disabled ? `-# This bestiary panel expired. Run ${commandMention('rpg bestiary')} again.` : `-# Bestiary panel expires after 3 minutes.`
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
			? `Use ${commandMention('rpg travel')} when you meet the Rank requirement to challenge this boss.`
			: `Use ${commandMention('rpg adventure')} in **${record.region.name}** to find this mob and farm its drops.`;

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

function buildItemGuidePanel(customIdBase, selectedId = null, disabled = false) {
	const selected = selectedId ? itemRecordById(selectedId) : null;
	const categories = itemGuideCategories().filter((category) => category.records.length);
	const container = new ContainerBuilder()
		.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`${icon.equipment} **RPG Item Guide**\n-# Choose gear or consumables from the dropdowns to inspect stats, traits, rarity, and sources.`
			)
		);

	for (const category of categories) {
		container.addActionRowComponents(
			new ActionRowBuilder().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(`${customIdBase}:${category.id}`)
					.setPlaceholder(`Choose ${category.label.toLowerCase()}`)
					.setDisabled(disabled)
					.addOptions(itemGuideOptions(category.records, selectedId))
			)
		);
	}

	container
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(selected ? formatItemGuideInfo(selected) : formatItemGuideIntro(categories)))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				disabled ? `-# This item guide expired. Run ${commandMention('rpg items')} again.` : `-# Item guide expires after 3 minutes.`
			)
		);

	return container;
}

function itemGuideCategories() {
	const records = itemRecords();
	return [
		{ id: 'weapon', label: 'Weapons', records: records.filter((record) => record.item.slot === 'weapon') },
		{ id: 'armor', label: 'Armor', records: records.filter((record) => record.item.slot === 'armor') },
		{ id: 'charm', label: 'Charms', records: records.filter((record) => record.item.slot === 'charm') },
		{ id: 'consumable', label: 'Consumables', records: records.filter((record) => record.item.slot === 'consumable') }
	];
}

function itemGuideOptions(records, selectedId) {
	return records.slice(0, 25).map(({ item }) => {
		const option = new StringSelectMenuOptionBuilder()
			.setLabel(item.name)
			.setDescription(`${titleCase(item.rarity)} ${titleCase(item.slot)} - ${formatItemStats(item.stats) || 'No stats'}`)
			.setValue(item.id)
			.setDefault(item.id === selectedId);
		const emoji = itemEmojiObject(item);
		if (emoji) option.setEmoji(emoji);
		return option;
	});
}

function formatItemGuideIntro(categories) {
	const counts = Object.fromEntries(categories.map((category) => [category.id, category.records.length]));
	return [
		`${icon.info} **Available Records**`,
		`${icon.damageDealt || icon.equipment} Weapons: **${counts.weapon || 0}**`,
		`${icon.health.full} Armor: **${counts.armor || 0}**`,
		`${icon.shards} Charms: **${counts.charm || 0}**`,
		`${icon.loot} Consumables: **${counts.consumable || 0}**`,
		'',
		`${icon.arrowRight} Use this guide to compare gear before equipping with ${commandMention('rpg equip')}.`,
		`${icon.arrowRight} Sources show whether an item comes from mobs, NPC quests, seasonal rewards, referrals, or server bosses.`
	].join('\n');
}

function formatItemGuideInfo(record) {
	const item = record.item;
	const equipText =
		item.slot === 'consumable'
			? `Use consumables from ${commandMention('rpg inventory')} during supported RPG actions.`
			: `Equip this with ${commandMention('rpg equip')} when it is in your inventory.`;

	return [
		`${formatItemName(item)} **${item.name}**`,
		`-# ${titleCase(item.rarity)} ${titleCase(item.slot)}`,
		[
			`${icon.settings} **Stats:** ${formatItemStats(item.stats) || 'None'}`,
			`${icon.success} **Traits:** ${formatTraits(item.traits)}`,
			`${icon.loot} **Source:** ${record.sources.join(', ') || 'Unknown'}`
		].join('\n'),
		`${icon.info} **Field Notes:** ${item.description}`,
		`${icon.arrowRight} ${equipText}`
	].join('\n\n');
}

function itemRecords() {
	return Object.values(items)
		.map((item) => ({ item, sources: itemSources(item.id) }))
		.sort((left, right) => itemSortValue(left.item) - itemSortValue(right.item) || left.item.name.localeCompare(right.item.name));
}

function itemRecordById(itemId) {
	return itemRecords().find((record) => record.item.id === itemId);
}

function itemSources(itemId) {
	const sources = new Set();
	for (const record of encounterRecords()) {
		if (record.encounter.loot?.includes(itemId)) sources.add(`${record.encounter.name} in ${record.region.name}`);
	}
	for (const quest of npcQuests) {
		if (quest.rewards?.items?.includes(itemId)) sources.add(`${quest.npc.name}'s quest in ${regions[quest.regionId]?.name || quest.regionId}`);
	}
	if (itemId === 'stormglass_aura') sources.add('Seasonal quest reward');
	if (itemId === 'gatebound_crest') sources.add('Referral reward');
	if (itemId === 'worldbreaker_sigil') sources.add('Server boss reward');
	return [...sources];
}

function itemSortValue(item) {
	const slots = { weapon: 0, armor: 1, charm: 2, consumable: 3 };
	const rarities = { common: 0, uncommon: 1, rare: 2, limited: 3, referral: 4, cooperative: 5 };
	return (slots[item.slot] ?? 9) * 100 + (rarities[item.rarity] ?? 50);
}

function formatItemStats(stats = {}) {
	return Object.entries(stats)
		.map(([stat, amount]) => `${titleCase(stat)} ${amount > 0 ? '+' : ''}${amount}`)
		.join(', ');
}

function getOwnedEquipableItems(profile) {
	return (profile.inventory || [])
		.map((entry) => ({ entry, item: items[entry.itemId], quantity: entry.quantity || 0 }))
		.filter(({ item, quantity }) => item && item.slot !== 'consumable' && quantity > 0);
}

function formatEquipment(profile) {
	const equipment = profile.equipment || {};
	return `${icon.equipment} **Equipment**\nWeapon: **${formatItemName(items[equipment.weapon]) || 'None'}**\nArmor: **${formatItemName(items[equipment.armor]) || 'None'}**\nCharm: **${formatItemName(items[equipment.charm]) || 'None'}**`;
}

function inventoryQuantity(profile, itemId) {
	return (profile.inventory || []).find((entry) => entry.itemId === itemId)?.quantity || 0;
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

function formatStats(stats) {
	return Object.entries(stats)
		.map(([stat, amount]) => `${titleCase(stat)} **${amount}**`)
		.join(' - ');
}

function formatTraits(traits = []) {
	return traits.length ? traits.map((trait) => `\`${titleCase(trait)}\``).join(', ') : 'None recorded';
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
	const missingCharacter = isMissingCharacterError(error);
	const expected = error instanceof rpg.RpgError || missingCharacter;
	if (!expected) console.error(error);

	const response = componentReply(
		missingCharacter
			? notice(
					`${icon.warning} **Start With The Tutorial**`,
					`You need to learn the RPG basics before using this command. Run ${commandMention('rpg tutorial')} first, then create your character when you are ready.`,
					color.warning
				)
			: notice(
					expected ? `${icon.warning} **RPG Notice**` : `${icon.fail} **RPG Error**`,
					expected ? error.message : 'Something unexpected happened while running the RPG action. The issue was logged.',
					expected ? color.warning : color.fail
				),
		true
	);

	if (interaction.deferred) return interaction.editReply(response).catch(() => null);
	if (interaction.replied) return interaction.followUp(response).catch(() => null);
	return interaction.reply(response).catch(() => null);
}

function isMissingCharacterError(error) {
	return error?.message === `Create a character first with ${commandMention('rpg create')}.`;
}

function getActiveRpgAction(interaction) {
	return getActiveAction(interaction.guild.id, interaction.user.id);
}

function setActiveRpgAction(interaction, type) {
	return setActiveAction(interaction.guild.id, interaction.user.id, type);
}

function clearActiveRpgAction(interaction) {
	return clearActiveAction(interaction.guild.id, interaction.user.id);
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

function isDeveloper(userId) {
	return [process.env.DEVELOPERS, process.env.BOT_OWNERS]
		.flatMap((value) => String(value || '').split(/\s+/))
		.filter(Boolean)
		.includes(userId);
}

function shouldDeferRpgCommand(interaction) {
	return ['achievements', 'season'].includes(interaction.options.getSubcommand(false));
}

module.exports = {
	UserCommand,
	buildBattleResultPanel,
	buildBattleResultReply,
	buildBossBattlePanel,
	buildEncounterPanel,
	handleRpgBattleInteraction,
	handleRpgComponentInteraction,
	handleRpgLeaderboardInteraction,
	buildProfilePanel,
	shouldDeferRpgCommand
};
