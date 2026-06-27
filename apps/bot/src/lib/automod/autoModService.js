const {
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleKeywordPresetType,
	AutoModerationRuleTriggerType,
	PermissionFlagsBits
} = require('discord.js');
const AutoModConfig = require('../schemas/autoModConfigSchema');

const RULE_NAMES = Object.freeze({
	preset: '[Cadia] Preset Content Filter',
	spam: '[Cadia] Spam Filter',
	mention: '[Cadia] Mention Spam Filter',
	keyword: '[Cadia] Custom Keyword Filter'
});

async function getAutoModConfig(guildId) {
	return (await AutoModConfig.findOne({ guildId })) || new AutoModConfig({ guildId, enabled: false });
}

async function saveAutoModConfig(guild, input, updatedBy = null, { effectiveEnabled } = {}) {
	const existing = await getAutoModConfig(guild.id);
	const normalized = normalizeAutoModConfig(input, existing);
	const shouldEnable = effectiveEnabled ?? normalized.enabled;
	assertAutoModPermissions(guild, normalized, shouldEnable);
	normalized.ruleIds = await syncAutoModRules(guild, normalized, shouldEnable);
	Object.assign(existing, normalized, { guildId: guild.id, updatedAt: Date.now(), updatedBy });
	await existing.save();
	return existing;
}

async function setAutoModModuleEnabled(guild, enabled) {
	const config = await getAutoModConfig(guild.id);
	config.ruleIds = await syncAutoModRules(guild, normalizeAutoModConfig(config, config), Boolean(enabled && config.enabled));
	config.updatedAt = Date.now();
	await config.save();
	return config;
}

async function syncAutoModRules(guild, config, effectiveEnabled = config.enabled) {
	const ruleIds = { preset: null, spam: null, mention: null, keyword: null, ...(config.ruleIds || {}) };
	const definitions = buildRuleDefinitions(config);

	for (const key of Object.keys(RULE_NAMES)) {
		const definition = definitions[key];
		const existing = ruleIds[key] ? await guild.autoModerationRules.fetch(ruleIds[key]).catch(() => null) : null;
		if (!definition) {
			if (existing) await existing.delete('Cadia AutoMod dashboard configuration').catch(() => null);
			ruleIds[key] = null;
			continue;
		}
		if (!effectiveEnabled && !existing) continue;
		const options = { ...definition, enabled: Boolean(effectiveEnabled), reason: 'Cadia AutoMod dashboard configuration' };
		const rule = existing ? await existing.edit(options) : await guild.autoModerationRules.create(options);
		ruleIds[key] = rule.id;
	}
	return ruleIds;
}

function buildRuleDefinitions(config) {
	const common = {
		eventType: AutoModerationRuleEventType.MessageSend,
		exemptRoles: config.exemptRoleIds,
		exemptChannels: config.exemptChannelIds
	};
	const presets = [];
	if (config.filters.profanity) presets.push(AutoModerationRuleKeywordPresetType.Profanity);
	if (config.filters.sexualContent) presets.push(AutoModerationRuleKeywordPresetType.SexualContent);
	if (config.filters.slurs) presets.push(AutoModerationRuleKeywordPresetType.Slurs);
	const hasKeywords = config.filters.keywords.length || config.filters.regexPatterns.length;

	return {
		preset: presets.length
			? {
				...common,
				name: RULE_NAMES.preset,
				triggerType: AutoModerationRuleTriggerType.KeywordPreset,
				triggerMetadata: { presets, allowList: config.filters.allowList },
				actions: buildActions(config, false)
			}
			: null,
		spam: config.filters.spam
			? {
				...common,
				name: RULE_NAMES.spam,
				triggerType: AutoModerationRuleTriggerType.Spam,
				triggerMetadata: {},
				actions: buildActions(config, false)
			}
			: null,
		mention: config.filters.mentionSpam
			? {
				...common,
				name: RULE_NAMES.mention,
				triggerType: AutoModerationRuleTriggerType.MentionSpam,
				triggerMetadata: {
					mentionTotalLimit: config.filters.mentionLimit,
					mentionRaidProtectionEnabled: config.filters.mentionRaidProtection
				},
				actions: buildActions(config, true)
			}
			: null,
		keyword: hasKeywords
			? {
				...common,
				name: RULE_NAMES.keyword,
				triggerType: AutoModerationRuleTriggerType.Keyword,
				triggerMetadata: {
					keywordFilter: config.filters.keywords,
					regexPatterns: config.filters.regexPatterns,
					allowList: config.filters.allowList
				},
				actions: buildActions(config, true)
			}
			: null
	};
}

function buildActions(config, supportsTimeout) {
	const actions = [];
	if (config.actions.blockMessage) {
		actions.push({
			type: AutoModerationActionType.BlockMessage,
			metadata: { customMessage: config.actions.customMessage || undefined }
		});
	}
	if (config.actions.alertChannelId) {
		actions.push({ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: config.actions.alertChannelId } });
	}
	if (supportsTimeout && config.actions.timeoutSeconds > 0) {
		actions.push({ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: config.actions.timeoutSeconds } });
	}
	if (!actions.length) actions.push({ type: AutoModerationActionType.BlockMessage });
	return actions;
}

function normalizeAutoModConfig(input = {}, existing = {}) {
	const filters = input.filters || {};
	const actions = input.actions || {};
	return {
		enabled: input.enabled === true,
		filters: {
			profanity: filters.profanity !== false,
			sexualContent: filters.sexualContent !== false,
			slurs: filters.slurs !== false,
			spam: filters.spam !== false,
			mentionSpam: filters.mentionSpam !== false,
			mentionLimit: clampInteger(filters.mentionLimit, 1, 50, 5),
			mentionRaidProtection: filters.mentionRaidProtection !== false,
			keywords: normalizeList(filters.keywords, 1000, 60),
			regexPatterns: normalizeList(filters.regexPatterns, 10, 260),
			allowList: normalizeList(filters.allowList, 100, 60)
		},
		actions: {
			blockMessage: actions.blockMessage !== false,
			customMessage: cleanText(actions.customMessage, 150),
			alertChannelId: snowflakeOrNull(actions.alertChannelId),
			timeoutSeconds: clampInteger(actions.timeoutSeconds, 0, 2_419_200, 0)
		},
		exemptRoleIds: normalizeSnowflakes(input.exemptRoleIds, 20),
		exemptChannelIds: normalizeSnowflakes(input.exemptChannelIds, 50),
		ruleIds: { preset: null, spam: null, mention: null, keyword: null, ...(existing.ruleIds || {}) }
	};
}

function serializeAutoModConfig(config) {
	const normalized = normalizeAutoModConfig(config, config);
	return {
		guildId: config.guildId,
		enabled: normalized.enabled,
		filters: normalized.filters,
		actions: normalized.actions,
		exemptRoleIds: normalized.exemptRoleIds,
		exemptChannelIds: normalized.exemptChannelIds
	};
}

function assertAutoModPermissions(guild, config, effectiveEnabled = config.enabled) {
	const member = guild.members.me;
	if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
		const error = new Error('Cadia needs Manage Server to configure Discord AutoMod.');
		error.code = 'AUTOMOD_MANAGE_GUILD_REQUIRED';
		throw error;
	}
	if (effectiveEnabled && config.actions.timeoutSeconds > 0 && !member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
		const error = new Error('Cadia needs Moderate Members to apply AutoMod timeouts.');
		error.code = 'AUTOMOD_MODERATE_MEMBERS_REQUIRED';
		throw error;
	}
}

function normalizeList(value, maxItems, maxLength) {
	const items = Array.isArray(value) ? value : String(value || '').split(/\r?\n|,/);
	return [...new Set(items.map((entry) => cleanText(entry, maxLength).trim()).filter(Boolean))].slice(0, maxItems);
}

function normalizeSnowflakes(value, maxItems) {
	return [...new Set((Array.isArray(value) ? value : []).map(String).filter((id) => /^\d{17,20}$/.test(id)))].slice(0, maxItems);
}

function snowflakeOrNull(value) {
	const id = String(value || '');
	return /^\d{17,20}$/.test(id) ? id : null;
}

function cleanText(value, maxLength) {
	return String(value || '')
		.replace(/[\u0000-\u001F\u007F]/g, '')
		.slice(0, maxLength);
}

function clampInteger(value, min, max, fallback) {
	const number = Number.parseInt(value, 10);
	return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
}

module.exports = {
	RULE_NAMES,
	buildActions,
	buildRuleDefinitions,
	getAutoModConfig,
	normalizeAutoModConfig,
	saveAutoModConfig,
	serializeAutoModConfig,
	setAutoModModuleEnabled,
	syncAutoModRules
};
