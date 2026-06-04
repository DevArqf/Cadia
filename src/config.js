const { seconds } = require('./lib/util/common/time');
const { PrivilegedUsers } = require('./lib/util/constants');

const { LogLevel, BucketScope } = require('@sapphire/framework');

const { GatewayIntentBits, Partials } = require('discord.js');

/**
 * @type {Config}
 */
const config = {
	intents: [
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping
	],
	cooldown_options: {
		delay: seconds(5),
		filteredUsers: PrivilegedUsers,
		scope: BucketScope.User
	},
	mentions: {
		parse: ['users'],
		repliedUser: false
	},
	partials: [Partials.GuildMember, Partials.Message, Partials.User, Partials.Channel],
	logger: {
		level: LogLevel.Info
	},
	api: {
		port: 4050
	}
};

/**
 * @type {import('discord.js').ClientOptions}
 */
const ClientConfig = {
	intents: config.intents,
	defaultPrefix: config.default_prefix,
	allowedMentions: config.mentions,
	caseInsensitiveCommands: true,
	caseInsensitivePrefixes: true,
	defaultCooldown: config.cooldown_options,
	partials: config.partials,
	logger: config.logger,
	loadMessageCommandListeners: true,
	typing: false,
	disableMentionPrefix: false,
	preventFailedToFetchLogForGuilds: true,
	api: config.api
};

// Check the Dev Portal to see the Custom Emojis //
const emojis = {
	reg: {
		success: '`✅`',
		warning: '`⚠️`',
		fail: '`❌`'
	},
	custom: {
		success: '<:check:1511889674736636065>',
		news: '<:announcement:1512143509082079425>',
		fail: '<:fail:1511898505457827982>',
		forbidden: '<:forbidden:1511899053862949026>',
		warning: '<:warning:1511901601798029443>',
		arrowright: '<:arrow_right:1511889254601588766>',
		connected: '<:connected:1511904513563562014>',
		disconnected: '<:failures:1511904514335051799>',
		online: '<:connected:1511904513563562014>',
		issues: '<:failures:1511904514335051799>',
		offline: '<:offline:1511904859018756226>',
		developer: '<:developer:1511903616091291779>',
		javascript: '<:cl_javascript:1223402720967393360>',
		tada1: '<:tada:1511951461745950791>',
		tada2: '<a:tada_a:1511962310531481792>',
		loading: '<a:loading:1511956877062307950>',
		right: '<:arrow_right:1511889254601588766>',
		left: '<:arrow_left:1511889256119930910>',
		update: '<:update:1511950597291774064>',
		home: '<:home:1511886652967092380>',
		slash: '<:slash:1511897531175407687>',
		wave: '<a:wave:1511959814975000686>',
		ban: '<:ban:1511950593457918205>',
		clock: '<:clock:1511893785330581614>',
		community: '<:members:1511892628713504798>',
		compass: '<:globe:1511898113151864864>',
		calendar: '<:calendar:1511904512137236490>',
		comment: '<:speech:1511891935265165435>',
		gem: '<:gem:1511950592036307155>',
		upvote: '<:upvote:1512147298568638484>',
		downvote: '<:downvote:1512147304688259214>',
		info: '<:info:1511900647581286572>',
		link: '<:link:1511889257659371571>',
		maintenance: '<:update:1511950597291774064>',
		heart1: '<:cl_heart:1223407863473639616>',
		heart2: '<a:cl_heart2:1220504936563867719>',
		settings: '<:settings:1511905967007076534>',
		question: '<:question:1511950594791837788>',
		mail: '<:mail:1511950590131966012>',
		person: '<:user:1511891554061779075>',
		pencil: '<:pencil:1511893279157780501>',
		crown: '<:crown:1511889950524707007>',
		boost: '<:boost:1511890318436470784>',
		save: '<:save:1511913525910442095>',
		friends: '<:members:1511892628713504798>',
		emoji1: '<:emoji1:1511894457555877938>',
		emoji2: '<:emoji2:1511894458734739566>',
		openfolder: '<:openfolder:1511894093733564576>',
		trash: '<:revoke:1511898504392474754>',
		lock: '<:lock:1511905627369111562>',
		chad: '<:chad:1511952062257303612>',
		globe: '<:globe:1511898113151864864>',
		reload: '<:refresh:1511913267608686695>'
	}
};

const color = {
	default: '#65b8da',
	success: '#3bb143',
	fail: '#e94041',
	warning: '#e9d502',
	invis: '#2b2d31',
	RPG: '5e3a6d',
	random: 'Random'
};

const channels = {
	commandLogging: '1511899903746375881',
	errorLogging: '1511899972499542176',
	blacklistLogging: '1511899952484188232',
	bugReports: '1511900008142737418'
};

module.exports = { ClientConfig, color, emojis, channels };

/**
 * @typedef {Object} Config
 * @property {GatewayIntentBits[]} intents
 * @property {import('@sapphire/framework').CooldownOptions} cooldown_options
 * @property {import('discord.js').MessageMentionOptions} mentions
 * @property {Partials[]} partials
 * @property {import('@sapphire/framework').ClientLoggerOptions} logger
 * @property {import('discord.js').PresenceData} presence
 * @property {import('@sapphire/framework').SapphirePrefix} default_prefix
 * @property {ScheduledTaskHandlerOptions} tasks
 * @property {import('@sapphire/plugin-api').ServerOptions} api
 */
