import type { DiscordServer, DiscordUser, LogEntry, PremiumPlan, Role } from './types';

// === Bot Owner IDs  ===
export const BOT_OWNER_IDS = ['899385550585364481', '833997532040134656'];

// === Mock logged-in user  ===
export const MOCK_USER: DiscordUser = {
	id: '899385550585364481', // matches owner — for demo, user IS the owner
	username: 'nyx',
	discriminator: '0',
	globalName: 'Nyx',
	avatar: '#65b8da'
};

// Alt user  for testing permission filtering
export const MOCK_USER_NON_OWNER: DiscordUser = {
	id: '123456789012345678',
	username: 'regular_user',
	discriminator: '0',
	globalName: 'Regular',
	avatar: '#5e3a6d'
};

// === Helper: build a role ===
function role(id: string, name: string, color: string, position: number, permissions: string[] = [], canManageCadia = false): Role {
	return { id, name, color, position, permissions, canManageCadia };
}

// === Mock Discord servers  ===.
export const MOCK_SERVERS: DiscordServer[] = [
	{
		id: '101',
		name: "Nyx's Haven",
		icon: '#65b8da',
		ownerId: '899385550585364481',
		memberCount: 1248,
		botInServer: true,
		userPermissions: ['ADMINISTRATOR'],
		userCanManage: true,
		features: ['COMMUNITY', 'NEWS', 'WELCOME_SCREEN_ENABLED'],
		premium: true,
		roles: [
			role('r1', '@everyone', '#99aab5', 0, [], false),
			role('r2', 'Member', '#65b8da', 1, [], false),
			role('r3', 'Moderator', '#3bb143', 5, ['MANAGE_MESSAGES', 'KICK_MEMBERS'], true),
			role('r4', 'Admin', '#e94041', 10, ['ADMINISTRATOR', 'MANAGE_GUILD'], true),
			role('r5', 'Bot', '#5e3a6d', 11, [], false)
		],
		region: 'us-east',
		createdAt: new Date('2022-03-14').getTime(),
		boostLevel: 2,
		boostCount: 14,
		channelCount: 48,
		textChannelCount: 32,
		voiceChannelCount: 10,
		categoryCount: 6,
		emojiCount: 60,
		stickerCount: 4,
		roleCount: 5,
		bannedCount: 23,
		invitesCount: 12,
		integrationsCount: 8,
		webhooksCount: 15,
		botJoinedAt: new Date('2023-01-10').getTime(),
		botNickname: 'Cadia',
		verificationLevel: 'High',
		explicitContentFilter: 'AllMembers',
		defaultNotifications: 'OnlyMentions',
		twoFactorRequired: true,
		vanityUrl: 'nyxhaven',
		banner: '#65b8da',
		description: 'A community for builders, gamers, and night owls. Welcome to the Haven.',
		maxBitrate: 384,
		maxFileSize: 50,
		afkChannel: 'AFK Lounge',
		afkTimeout: 300,
		systemChannel: 'system-log',
		rulesChannel: 'rules',
		updatesChannel: 'announcements',
		botPrefix: '!',
		channels: [
			{ id: 'ch-101-1', name: 'welcome', type: 'text' },
			{ id: 'ch-101-2', name: 'general', type: 'text' },
			{ id: 'ch-101-3', name: 'rules', type: 'text' },
			{ id: 'ch-101-4', name: 'announcements', type: 'text' },
			{ id: 'ch-101-5', name: 'mod-log', type: 'text' },
			{ id: 'ch-101-6', name: 'bot-commands', type: 'text' },
			{ id: 'ch-101-7', name: 'off-topic', type: 'text' },
			{ id: 'ch-101-8', name: 'General Voice', type: 'voice' },
			{ id: 'ch-101-9', name: 'AFK Lounge', type: 'voice' }
		],
		botStatus: 'online'
	},
	{
		id: '102',
		name: 'Pixel Crusaders',
		icon: '#5e3a6d',
		ownerId: '899385550585364481',
		memberCount: 532,
		botInServer: true,
		userPermissions: ['ADMINISTRATOR'],
		userCanManage: true,
		features: ['COMMUNITY'],
		premium: false,
		roles: [
			role('p1', '@everyone', '#99aab5', 0, [], false),
			role('p2', 'Knight', '#65b8da', 1, [], false),
			role('p3', 'RPG Master', '#5e3a6d', 5, ['MANAGE_MESSAGES'], true),
			role('p4', 'Server Owner', '#e9d502', 10, ['ADMINISTRATOR', 'MANAGE_GUILD'], true)
		],
		region: 'eu-west',
		createdAt: new Date('2023-07-22').getTime(),
		boostLevel: 1,
		boostCount: 5,
		channelCount: 24,
		textChannelCount: 16,
		voiceChannelCount: 5,
		categoryCount: 3,
		emojiCount: 28,
		stickerCount: 2,
		roleCount: 4,
		bannedCount: 7,
		invitesCount: 4,
		integrationsCount: 3,
		webhooksCount: 6,
		botJoinedAt: new Date('2024-02-05').getTime(),
		botNickname: 'Cadia',
		verificationLevel: 'Medium',
		explicitContentFilter: 'MembersWithoutRoles',
		defaultNotifications: 'OnlyMentions',
		twoFactorRequired: false,
		vanityUrl: null,
		banner: null,
		description: 'RPG community running weekly campaigns and PvP nights.',
		maxBitrate: 128,
		maxFileSize: 25,
		afkChannel: null,
		afkTimeout: 600,
		systemChannel: 'system',
		rulesChannel: 'rules',
		updatesChannel: null,
		botPrefix: '?',
		channels: [
			{ id: 'ch-102-1', name: 'general', type: 'text' },
			{ id: 'ch-102-2', name: 'rpg', type: 'text' },
			{ id: 'ch-102-3', name: 'rules', type: 'text' },
			{ id: 'ch-102-4', name: 'system', type: 'text' },
			{ id: 'ch-102-5', name: 'bot-spam', type: 'text' },
			{ id: 'ch-102-6', name: 'Lounge', type: 'voice' }
		],
		botStatus: 'online'
	},
	{
		id: '103',
		name: 'Test Grounds',
		icon: '#e9d502',
		ownerId: '899385550585364481',
		memberCount: 12,
		botInServer: false, // not yet added — should show invite redirect
		userPermissions: ['ADMINISTRATOR'],
		userCanManage: true,
		features: [],
		premium: false,
		roles: [role('t1', '@everyone', '#99aab5', 0, [], false), role('t2', 'Admin', '#e94041', 5, ['ADMINISTRATOR'], false)],
		region: 'us-west',
		createdAt: new Date('2024-11-01').getTime(),
		boostLevel: 0,
		boostCount: 0,
		channelCount: 5,
		textChannelCount: 3,
		voiceChannelCount: 1,
		categoryCount: 1,
		emojiCount: 4,
		stickerCount: 0,
		roleCount: 2,
		bannedCount: 0,
		invitesCount: 1,
		integrationsCount: 0,
		webhooksCount: 0,
		botJoinedAt: Date.now(),
		botNickname: 'Cadia',
		verificationLevel: 'Low',
		explicitContentFilter: 'Disabled',
		defaultNotifications: 'AllMessages',
		twoFactorRequired: false,
		vanityUrl: null,
		banner: null,
		description: null,
		maxBitrate: 96,
		maxFileSize: 25,
		afkChannel: null,
		afkTimeout: 300,
		systemChannel: 'general',
		rulesChannel: null,
		updatesChannel: null,
		botPrefix: '!',
		channels: [
			{ id: 'ch-103-1', name: 'general', type: 'text' },
			{ id: 'ch-103-2', name: 'bot-test', type: 'text' },
			{ id: 'ch-103-3', name: 'Test Voice', type: 'voice' }
		],
		botStatus: 'online'
	},
	// These should NOT appear in dash (user lacks manage perms):
	{
		id: '104',
		name: 'Some Random Server (no perms)',
		icon: '#8a99ab',
		ownerId: '999999999999999999',
		memberCount: 8000,
		botInServer: true,
		userPermissions: [],
		userCanManage: false, // hidden
		features: [],
		premium: false,
		roles: [role('h1', '@everyone', '#99aab5', 0, [], false)],
		region: 'us-east',
		createdAt: new Date('2021-01-01').getTime(),
		boostLevel: 3,
		boostCount: 42,
		channelCount: 120,
		textChannelCount: 80,
		voiceChannelCount: 25,
		categoryCount: 15,
		emojiCount: 100,
		stickerCount: 8,
		roleCount: 18,
		bannedCount: 412,
		invitesCount: 35,
		integrationsCount: 22,
		webhooksCount: 47,
		botJoinedAt: new Date('2022-06-15').getTime(),
		botNickname: 'Cadia',
		verificationLevel: 'Highest',
		explicitContentFilter: 'AllMembers',
		defaultNotifications: 'OnlyMentions',
		twoFactorRequired: true,
		vanityUrl: 'bigserver',
		banner: null,
		description: 'Some big public server.',
		maxBitrate: 384,
		maxFileSize: 100,
		afkChannel: 'AFK',
		afkTimeout: 300,
		systemChannel: 'system',
		rulesChannel: 'rules',
		updatesChannel: 'updates',
		botPrefix: '.',
		channels: [
			{ id: 'ch-104-1', name: 'general', type: 'text' },
			{ id: 'ch-104-2', name: 'announcements', type: 'text' },
			{ id: 'ch-104-3', name: 'updates', type: 'text' },
			{ id: 'ch-104-4', name: 'mod-only', type: 'text' }
		],
		botStatus: 'online'
	}
];

// === Initial logs ===
export const INITIAL_LOGS: LogEntry[] = [
	{
		id: 'log-1',
		type: 'command',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Used /kick',
		details: "Kicked user 'spammer123' — reason: spam",
		timestamp: Date.now() - 1000 * 60 * 5
	},
	{
		id: 'log-2',
		type: 'moderation',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'Moderator Alex',
		actorId: '222222222222222222',
		action: 'Muted member',
		details: "Muted 'noisy_user' for 10 minutes — reason: caps spam",
		timestamp: Date.now() - 1000 * 60 * 22
	},
	{
		id: 'log-3',
		type: 'automod',
		serverId: '102',
		serverName: 'Pixel Crusaders',
		actor: 'Cadia AutoMod',
		actorId: '0',
		action: 'Auto-banned member',
		details: "Auto-banned 'raider_99' — triggered anti-raid protection",
		timestamp: Date.now() - 1000 * 60 * 60 * 2
	},
	{
		id: 'log-4',
		type: 'config',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Updated module config',
		details: 'Set cooldown to 5s — RPG System',
		timestamp: Date.now() - 1000 * 60 * 60 * 6
	},
	{
		id: 'log-5',
		type: 'audit',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Added manager role',
		details: 'Added Admin to Manager access',
		timestamp: Date.now() - 1000 * 60 * 60 * 12
	},
	{
		id: 'log-6',
		type: 'botstatus',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'system',
		actorId: '0',
		action: 'Bot status: Online',
		details: 'Cadia is now online — v2.4.1, 5 modules loaded',
		timestamp: Date.now() - 1000 * 60 * 60 * 24
	},
	{
		id: 'log-7',
		type: 'moderation',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'Moderator Alex',
		actorId: '222222222222222222',
		action: 'Warned member',
		details: "Warned 'troublemaker' — reason: inappropriate language",
		timestamp: Date.now() - 1000 * 60 * 30
	},
	{
		id: 'log-8',
		type: 'command',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Used /purge',
		details: 'Purged 15 messages in #general',
		timestamp: Date.now() - 1000 * 60 * 45
	},
	{
		id: 'log-9',
		type: 'automod',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'Cadia AutoMod',
		actorId: '0',
		action: 'Auto-muted member',
		details: "Auto-muted 'spammer_x' for 5 minutes — reason: link spam",
		timestamp: Date.now() - 1000 * 60 * 90
	},
	{
		id: 'log-10',
		type: 'config',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Updated bot prefix',
		details: "Set prefix to '!'",
		timestamp: Date.now() - 1000 * 60 * 120
	},
	{
		id: 'log-11',
		type: 'audit',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Removed manager role',
		details: 'Removed Moderator from Manager access',
		timestamp: Date.now() - 1000 * 60 * 180
	},
	{
		id: 'log-12',
		type: 'moderation',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'Moderator Alex',
		actorId: '222222222222222222',
		action: 'Banned member',
		details: "Banned 'raider_42' — reason: mass mention spam",
		timestamp: Date.now() - 1000 * 60 * 210
	},
	{
		id: 'log-13',
		type: 'command',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Used /ban',
		details: "Banned user 'toxic_player' — reason: toxicity",
		timestamp: Date.now() - 1000 * 60 * 240
	},
	{
		id: 'log-14',
		type: 'automod',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'Cadia AutoMod',
		actorId: '0',
		action: 'Auto-deleted messages',
		details: "Auto-deleted 3 messages from 'caps_user' — reason: excessive caps",
		timestamp: Date.now() - 1000 * 60 * 300
	},
	{
		id: 'log-15',
		type: 'config',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Enabled module',
		details: 'Welcome module enabled',
		timestamp: Date.now() - 1000 * 60 * 360
	},
	{
		id: 'log-16',
		type: 'audit',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Updated module config',
		details: 'Set cooldown to 3s — RPG System',
		timestamp: Date.now() - 1000 * 60 * 420
	},
	{
		id: 'log-17',
		type: 'moderation',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'Moderator Alex',
		actorId: '222222222222222222',
		action: 'Kicked member',
		details: "Kicked 'rule_breaker' — reason: repeated rule violations",
		timestamp: Date.now() - 1000 * 60 * 480
	},
	{
		id: 'log-18',
		type: 'command',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Used /warn',
		details: "Warned user 'newbie' — reason: spamming emojis",
		timestamp: Date.now() - 1000 * 60 * 540
	},
	{
		id: 'log-19',
		type: 'botstatus',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'system',
		actorId: '0',
		action: 'Bot status: Maintenance',
		details: 'Bot status changed from online to maintenance — commands will be read-only',
		timestamp: Date.now() - 1000 * 60 * 600
	},
	{
		id: 'log-20',
		type: 'config',
		serverId: '101',
		serverName: "Nyx's Haven",
		actor: 'nyx',
		actorId: '899385550585364481',
		action: 'Disabled module',
		details: 'Economy module disabled',
		timestamp: Date.now() - 1000 * 60 * 720
	}
];

// === Premium plans ===
export const PREMIUM_PLANS: PremiumPlan[] = [
	{
		id: 'plan-free',
		name: 'Free',
		price: 0,
		period: 'forever',
		color: '#8a99ab',
		features: ['3 modules enabled', 'Basic moderation', '7-day log retention', 'Community support']
	},
	{
		id: 'plan-pro',
		name: 'Pro',
		price: 4,
		period: 'month',
		color: '#65b8da',
		features: ['All modules enabled', 'Advanced moderation + auto-mod', '90-day log retention', 'Custom welcome cards', 'Priority email support'],
		highlight: true
	},
	{
		id: 'plan-rpg',
		name: 'RPG Guild',
		price: 8,
		period: 'month',
		color: '#5e3a6d',
		features: [
			'Everything in Pro',
			'Full RPG system with custom classes',
			'Custom quests & PvP arenas',
			'Unlimited log retention',
			'Custom pixel-art branding',
			'Dedicated support channel'
		]
	}
];
