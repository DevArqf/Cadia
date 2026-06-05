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
		slash: '<:slash:1512599530158162180>',
		wave: '<a:wave:1511959814975000686>',
		ban: '<:ban:1511950593457918205>',
		clock: '<:clock:1512599535765946489>',
		community: '<:members:1512599538081337365>',
		compass: '<:globe:1512599529264779405>',
		calendar: '<:calendar:1511904512137236490>',
		comment: '<:speech:1512599539352338452>',
		gem: '<:gem:1511950592036307155>',
		upvote: '<:upvote:1512147298568638484>',
		downvote: '<:downvote:1512147304688259214>',
		info: '<:info:1512599527830327408>',
		link: '<:link:1512599543860957186>',
		maintenance: '<:update:1511950597291774064>',
		heart1: '<:cl_heart:1223407863473639616>',
		heart2: '<a:cl_heart2:1220504936563867719>',
		settings: '<:settings:1511905967007076534>',
		question: '<:question:1511950594791837788>',
		mail: '<:mail:1511950590131966012>',
		person: '<:user:1512599540912492614>',
		pencil: '<:pencil:1512599536919515247>',
		crown: '<:crown:1511889950524707007>',
		boost: '<:boost:1511890318436470784>',
		save: '<:save:1511913525910442095>',
		friends: '<:friends:1512599542254669956>',
		emoji1: '<:emoji1:1512599531068588102>',
		emoji2: '<:emoji2:1512599532519559188>',
		openfolder: '<:openfolder:1512599534075641959>',
		trash: '<:revoke:1511898504392474754>',
		lock: '<:lock:1511905627369111562>',
		chad: '<:chad:1511952062257303612>',
		globe: '<:globe:1512599529264779405>',
		reload: '<:refresh:1511913267608686695>',
		coin: '<:coin:1512490397731913758>',
		shards: '<:shard:1512359021657587762>',
		lettera: '<:a_rank:1512360116135923732>',
		letterb: '<:b_rank:1512360122079514687>',
		letterc: '<:c_rank:1512360117281099887>',
		letterd: '<:d_rank:1512360123346059305>',
		lettere: '<:e_rank:1512360124562407504>',
		letterf: '<:f_rank:1512360125661446266>',
		letters: '<:s_rank:1512360118455504926>',
		letterss: '<:ss_rank:1512360119512465560>',
		lettersss: '<:sss_rank:1512360120594595901>',
		rpgheart: '<:rpgheart:1512472494404145172>',
		orb: '<:orb:1512477299650461848>',
		rpgglobe: '<:rpgglobe:1512478910993141900>',
		rpguser: '<:rpguser:1512479283711312033>',
		rpgtime: '<:rpgtime:1512485307789086971>',
		rpgchapter: '<:rpgchapter:1512485810081890484>',
		rpgheartFull: '<:fullheart:1512490037877538836>',
		rpgheartHalf: '<:halfheart:1512490039786078260>',
		rpgheartEmpty: '<:emptyheart:1512490062477004900>',
		rpglb_bg: '<:rpglb_bg:1512491388372259109>',
		xp_0: '<:xp_0:1512493566373527593>',
		xp_1: '<:xp_1:1512493568223219762>',
		xp_2: '<:xp_2:1512493570328629519>',
		xp_3: '<:xp_3:1512493571540910190>',
		xp_4: '<:xp_4:1512493573256384602>',
		xp_5: '<:xp_5:1512493574741168289>',
		xp_6: '<:xp_6:1512493575714111531>',
		xp_7: '<:xp_7:1512493577064677596>',
		xp_8: '<:xp_8:1512493578926948382>',
		xp_9: '<:xp_9:1512493581275758762>',
		xp_10: '<:xp_10:1512493582450425927>',
		xp_11: '<:xp_11:1512493583486292099>',
		xp_12: '<:xp_12:1512493584677470381>',
		xp_13: '<:xp_13:1512493585688301800>',
		xp_14: '<:xp_14:1512493587248713910>',
		xp_15: '<:xp_15:1512493588301484122>',
		xp_16: '<:xp_16:1512493589492662322>',
		xp_17: '<:xp_17:1512493591816179784>',
		xp_18: '<:xp_18:1512493593087181012>',
		xp_19: '<:xp_19:1512493596597817455>',
		xp_20: '<:xp_20:1512493600573751316>',
		orbRed: '<:orb_red:1512578160544186468>',
		orbBlue: '<:orb_blue:1512578165481017495>',
		orbGreen: '<:orb_green:1512578161970253965>',
		orbPurple: '<:orb_purple:1512578163186733207>',
		orbYellow: '<:orb_yellow:1512578164251951156>'
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
