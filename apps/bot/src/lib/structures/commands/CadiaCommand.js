const { ApplicationCommandRegistry, Command, PreconditionContainerArray, Args: SapphireArgs, UserError } = require('@sapphire/framework');

const {
	AutocompleteInteraction,
	ContextMenuCommandInteraction: CTXMenuCommandInteraction,
	ChatInputCommandInteraction: ChatInputInteraction,
	Message,
	MessageContextMenuCommandInteraction: MessageCTXCommandInteraction,
	PermissionFlagsBits,
	PermissionsBitField,
	UserContextMenuCommandInteraction: UserCTXMenuCommandInteraction,
	ContextMenuCommandInteraction
} = require('discord.js');

const { GuildMessage } = require('../../types/Discord');
const { seconds } = require('../../util/common/time');
const { PermissionLevels } = require('../../types/Enums');
const { runPrefixCommand } = require('../../commands/prefixAdapter');

/**
 * Represents a custom command class with extended functionality.
 * @extends Command
 * @namespace CadiaCommand
 */
class CadiaCommand extends Command {
	/**
	 * Constructs a new instance of the CadiaCommand class.
	 * @param {Command.LoaderContext} context - The context in which the command is executed.
	 * @param {CadiaCommand.Options} options - Options to configure the command.
	 */
	constructor(context, options) {
		const perms = new PermissionsBitField(options.requiredClientPermissions).add(
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks,
			PermissionFlagsBits.ViewChannel
		);

		super(context, {
			requiredClientPermissions: perms,
			cooldownDelay: seconds(5),
			...options
		});

		/**
		 * Whether the command is guarded.
		 * @type {boolean}
		 * @memberof CadiaCommand
		 */
		this.guarded = options.guarded || false;

		/**
		 * Whether the command is hidden.
		 * @type {boolean}
		 * @memberof CadiaCommand
		 */
		this.hidden = options.hidden || false;

		/**
		 * The permission level required to run the command.
		 * @type {number}
		 * @memberof CadiaCommand
		 */
		this.permissionLevel = options.permissionLevel || PermissionLevels.Everyone;
	}

	/**
	 * Throws a UserError with the specified message or options.
	 * @param {string | UserError.Options} message - The error message or options.
	 * @param {unknown} [context] - Additional context information for the error.
	 * @throws {UserError} - The thrown UserError.
	 * @memberof CadiaCommand
	 */
	error(message, context) {
		throw typeof message === 'string' ? new UserError({ identifier: 'Error', message, context }) : new UserError(message);
	}

	async messageRun(message, _args, context) {
		try {
			return await runPrefixCommand(this, message, context);
		} catch (error) {
			if (error?.identifier || error?.name === 'UserError') throw error;
			return message.reply(
				`Could not run that prefix command: ${error.message}\nUse \`cd help\` or the slash-command form for guided options.`
			);
		}
	}

	/**
	 * Parses the constructor pre-conditions for the permission level and community options.
	 * @param {CadiaCommand.Options} options - Options to configure the command.
	 * @protected
	 * @memberof CadiaCommand
	 */
	parseConstructorPreConditions(options) {
		super.parseConstructorPreConditions(options);
		this.preconditions.append('GuildOnly');
		this.parseConstructorPreConditionsPermissionLevel(options);
		if (options.community) {
			this.preconditions.append('Community');
		}
	}

	/**
	 * Parses the constructor pre-conditions for the permission level.
	 * @param {CadiaCommand.Options} options - Options to configure the command.
	 * @protected
	 * @memberof CadiaCommand
	 */
	parseConstructorPreConditionsPermissionLevel(options) {
		if (options.permissionLevel === PermissionLevels.BotOwner) {
			this.preconditions.append('BotOwner');
			return;
		}

		if (options.permissionLevel === PermissionLevels.Developer) {
			this.preconditions.append('DevOnly');
			return;
		}

		const container = new PreconditionContainerArray(['BotOwner'], this.preconditions);
		switch (options.permissionLevel || PermissionLevels.Everyone) {
			case PermissionLevels.Everyone:
				container.append('Everyone');
				break;
			case PermissionLevels.Staff:
				container.append('Staff');
				break;
			case PermissionLevels.Moderator:
				container.append('Moderator');
				break;
			case PermissionLevels.Administrator:
				container.append('Administrator');
				break;
			case PermissionLevels.ServerOwner:
				container.append('ServerOwner');
				break;
			default:
				throw new Error(
					`CadiaCommand[${this.name}]: "permissionLevel" was specified as an invalid permission level (${options.permissionLevel}).`
				);
		}

		this.preconditions.append(container);
	}
}

/**
 * @namespace CadiaCommand
 * @typedef {(Command.Options & {guarded?: boolean;	hidden? : boolean; permissionLevel?: number;community?: boolean})} Options - Options for configuring the CadiaCommand.
 * @property {boolean} [guarded=false] - Whether the command can be disabled.
 * @property {boolean} [hidden=false] - Whether the command is hidden from everyone.
 * @property {number} [permissionLevel] - The permission level required to run the command.
 * @typedef {SapphireArgs} Args - Additional types for command arguments.
 * @typedef {ChatInputInteraction<'cached'>} ChatInputCommandInteraction - Type for command chat input interaction.
 * @typedef {CTXMenuCommandInteraction<'cached'>} ContextMenuCommandInteraction - Type for command context menu interaction.
 * @typedef {UserCTXMenuCommandInteraction<'cached'>} UserContextMenuCommandInteraction - Type for command user context menu interaction.
 * @typedef {MessageCTXCommandInteraction<'cached'>} MessageContextMenuCommandInteraction - Type for command message context menu interaction.
 * @typedef {AutocompleteInteraction} AutoComplete - Type for command autocomplete interaction.
 * @typedef {Command.LoaderContext} Context - Type for command context.
 * @typedef {SapphireArgs} Args - Type for command arguments.
 * @typedef {GuildMessage} Message - Type for command message.
 * @typedef {ApplicationCommandRegistry} Registry - Type for command registry.
 */

module.exports = CadiaCommand;
