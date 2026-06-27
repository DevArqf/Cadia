const { Precondition } = require('@sapphire/framework');
const { branding } = require('../../config');
const runtimeConfig = require('../../lib/runtime/runtimeConfig');
const { isDeveloper } = require('../../lib/util/authorization');

class RuntimeConfigPrecondition extends Precondition {
	constructor(context, options) {
		super(context, {
			...options,
			name: 'RuntimeConfig',
			position: 2
		});
	}

	async messageRun(message, command) {
		return this.check(command?.name, message.author.id);
	}

	async chatInputRun(interaction) {
		return this.check(commandPathFromInteraction(interaction), interaction.user.id);
	}

	async contextMenuRun(interaction) {
		return this.check(interaction.commandName, interaction.user.id);
	}

	async check(commandName, userId) {
		if (isRuntimeConfigBypassed(userId)) return this.ok();

		const maintenanceEnabled = await runtimeConfig.getRuntimeConfig('maintenance.enabled', false);
		if (maintenanceEnabled) {
			return this.error({
				identifier: 'MaintenanceMode',
				message: `${branding.name} is in maintenance mode while a hotfix is being applied. Try again shortly.`
			});
		}

		const disabledCommands = await runtimeConfig.getRuntimeConfig('commands.disabled', []);
		if (Array.isArray(disabledCommands) && disabledCommands.includes(commandName)) {
			return this.error({
				identifier: 'CommandDisabled',
				message: `The \`/${commandName}\` command is temporarily disabled by runtime config.`
			});
		}

		return this.ok();
	}
}

function commandPathFromInteraction(interaction) {
	const parts = [interaction.commandName];
	const group = interaction.options?.getSubcommandGroup?.(false);
	const subcommand = interaction.options?.getSubcommand?.(false);
	if (group) parts.push(group);
	if (subcommand) parts.push(subcommand);
	return parts.filter(Boolean).join(' ');
}

function isRuntimeConfigBypassed(userId) {
	return String(userId) === String(branding.ownerUserId) || isDeveloper(userId);
}

module.exports = {
	RuntimeConfigPrecondition,
	commandPathFromInteraction,
	isRuntimeConfigBypassed
};
