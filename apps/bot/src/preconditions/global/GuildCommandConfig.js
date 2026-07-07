const { Precondition } = require('@sapphire/framework');
const {
	MODULES,
	IMMUTABLE_COMMANDS,
	IMMUTABLE_MODULES,
	getCommandPolicy,
	getGuildCommandConfig,
	getModulePolicy,
	isDeveloperCommand,
	resolveModuleId
} = require('../../lib/runtime/guildCommandConfig');

const cooldowns = new Map();

class GuildCommandConfigPrecondition extends Precondition {
	constructor(context, options) {
		super(context, { ...options, name: 'GuildCommandConfig', position: 3 });
	}

	messageRun(message, command) {
		return this.check(message.guildId, message.author.id, command, {
			channelId: message.channelId,
			roleIds: roleIdsFromMember(message.member)
		});
	}

	chatInputRun(interaction, command) {
		return this.check(interaction.guildId, interaction.user.id, command, {
			channelId: interaction.channelId,
			roleIds: roleIdsFromMember(interaction.member)
		});
	}

	contextMenuRun(interaction, command) {
		return this.check(interaction.guildId, interaction.user.id, command, {
			channelId: interaction.channelId,
			roleIds: roleIdsFromMember(interaction.member)
		});
	}

	async check(guildId, userId, command, context = {}) {
		if (!guildId) return this.ok();
		const moduleId = resolveModuleId(command);
		if (!moduleId) return this.ok();
		const config = await getGuildCommandConfig(guildId);
		const result = evaluateCommandPolicy(config, command, { ...context, guildId, userId });
		if (!result.allowed) return this.error(result.error);

		const cooldown = result.cooldown;
		if (cooldown > 0) {
			const key = `${guildId}:${userId}:${command.name}`;
			const now = context.now || Date.now();
			const expiresAt = cooldowns.get(key) || 0;
			if (expiresAt > now) {
				return this.error({
					identifier: 'DashboardCooldown',
					message: `The \`/${command.name}\` command is on cooldown for another ${Math.ceil((expiresAt - now) / 1_000)} second(s).`
				});
			}
			cooldowns.set(key, now + cooldown * 1_000);
		}

		return this.ok();
	}
}

function evaluateCommandPolicy(config, command, context = {}) {
	const moduleId = resolveModuleId(command);
	if (isDeveloperCommand(command)) return { allowed: true, cooldown: 0 };
	const modulePolicy = getModulePolicy(config, moduleId);
	const commandPolicy = getCommandPolicy(config, command.name);
	const moduleName = moduleId ? MODULES[moduleId].name : null;

	if (moduleId && !IMMUTABLE_MODULES.has(moduleId) && !modulePolicy.enabled) {
		return denied(
			'ModuleDisabled',
			renderPolicyMessage(modulePolicy.response, command.name, moduleName) ||
				`The **${moduleName}** module is disabled in this server.`
		);
	}
	if (!IMMUTABLE_COMMANDS.has(command.name) && !commandPolicy.enabled) {
		return denied(
			'CommandDisabled',
				renderPolicyMessage(commandPolicy.response, command.name, moduleName || 'Commands') ||
				`The \`/${command.name}\` command is disabled in this server.`
		);
	}

	const roleIds = new Set((context.roleIds || []).map(String));
	if (moduleId && modulePolicy.allowedRoleIds.length && !modulePolicy.allowedRoleIds.some((id) => roleIds.has(id))) {
		return denied('ModuleRoleRestricted', `You do not have an allowed role for the **${moduleName}** module.`);
	}
	if (moduleId && modulePolicy.restrictedRoleIds.some((id) => roleIds.has(id))) {
		return denied('ModuleRoleRestricted', `One of your roles is blocked from the **${moduleName}** module.`);
	}
	if (commandPolicy.allowedRoleIds.length && !commandPolicy.allowedRoleIds.some((id) => roleIds.has(id))) {
		return denied('CommandRoleRestricted', `You do not have an allowed role for the \`/${command.name}\` command.`);
	}
	if (commandPolicy.ignoredRoleIds.some((id) => roleIds.has(id))) {
		return denied('CommandRoleRestricted', `One of your roles is blocked from the \`/${command.name}\` command.`);
	}

	const channelId = String(context.channelId || '');
	if (commandPolicy.allowedChannelIds.length && !commandPolicy.allowedChannelIds.includes(channelId)) {
		return denied('CommandChannelRestricted', `The \`/${command.name}\` command is not enabled in this channel.`);
	}
	if (commandPolicy.ignoredChannelIds.includes(channelId)) {
		return denied('CommandChannelRestricted', `The \`/${command.name}\` command is disabled in this channel.`);
	}

	return { allowed: true, cooldown: commandPolicy.cooldown || modulePolicy.cooldown };
}

function denied(identifier, message) {
	return { allowed: false, cooldown: 0, error: { identifier, message } };
}

function renderPolicyMessage(template, commandName, moduleName) {
	return String(template || '')
		.replaceAll('{command}', `/${commandName}`)
		.replaceAll('{module}', moduleName);
}

function roleIdsFromMember(member) {
	if (!member) return [];
	if (Array.isArray(member.roles)) return member.roles;
	if (member.roles?.cache) return [...member.roles.cache.keys()];
	return [];
}

function clearDashboardCooldowns() {
	cooldowns.clear();
}

module.exports = {
	GuildCommandConfigPrecondition,
	clearDashboardCooldowns,
	evaluateCommandPolicy,
	renderPolicyMessage,
	roleIdsFromMember
};
