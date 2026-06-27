const { createModel } = require('../database/model');

module.exports = createModel('autoModConfigSchema', {
	guildId: null,
	enabled: false,
	filters: () => ({
		profanity: true,
		sexualContent: true,
		slurs: true,
		spam: true,
		mentionSpam: true,
		mentionLimit: 5,
		mentionRaidProtection: true,
		keywords: [],
		regexPatterns: [],
		allowList: []
	}),
	actions: () => ({
		blockMessage: true,
		customMessage: "This message was blocked by Cadia's AutoMod.",
		alertChannelId: null,
		timeoutSeconds: 0
	}),
	exemptRoleIds: () => [],
	exemptChannelIds: () => [],
	ruleIds: () => ({ preset: null, spam: null, mention: null, keyword: null }),
	createdAt: () => Date.now(),
	updatedAt: () => Date.now(),
	updatedBy: null
});
