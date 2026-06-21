const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');
const { componentReply, notice, panel } = require('../../lib/util/components');
const rpg = require('../../lib/rpg/service');
const { MessageFlags } = require('discord.js');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Manage private RPG System access'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('rpg-access')
				.setDescription(this.description)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('grant')
						.setDescription('Grant a user access to the private RPG System')
						.addStringOption((option) => option.setName('user-id').setDescription('Discord user ID').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('revoke')
						.setDescription('Revoke a user from the private RPG System')
						.addStringOption((option) => option.setName('user-id').setDescription('Discord user ID').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('check')
						.setDescription('Check whether a user has RPG System access')
						.addStringOption((option) => option.setName('user-id').setDescription('Discord user ID').setRequired(true))
				)
		);
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const subcommand = interaction.options.getSubcommand();
		const userId = interaction.options.getString('user-id', true).trim();

		try {
			if (subcommand === 'grant') {
				const access = await rpg.grantRpgAccess(userId, interaction.user.id);
				return interaction.editReply(componentReply(buildAccessPanel('Access Granted', access, interaction.user.id), true));
			}

			if (subcommand === 'revoke') {
				const access = await rpg.revokeRpgAccess(userId, interaction.user.id);
				return interaction.editReply(componentReply(buildAccessPanel('Access Revoked', access, interaction.user.id), true));
			}

			const access = await rpg.getRpgAccess(userId);
			return interaction.editReply(
				componentReply(buildAccessPanel('Access Check', access || { userId, enabled: false }, interaction.user.id), true)
			);
		} catch (error) {
			const expected = error instanceof rpg.RpgError;
			if (!expected) console.error(error);
			return interaction.editReply(
				componentReply(
					notice(
						expected ? `${emojis.custom.warning} **RPG Access Notice**` : `${emojis.custom.fail} **RPG Access Error**`,
						expected ? error.message : 'Something unexpected happened while updating RPG access.',
						expected ? color.warning : color.fail
					),
					true
				)
			);
		}
	}
}

function buildAccessPanel(title, access, actorId) {
	const enabled = Boolean(access.enabled);
	return panel({
		accentColor: enabled ? color.success : color.warning,
		title: `${enabled ? emojis.custom.success : emojis.custom.warning} **RPG ${title}**`,
		subtitle: enabled ? 'Private RPG access enabled' : 'Private RPG access disabled',
		sections: [
			[
				`${emojis.custom.person} **User ID:** \`${access.userId}\``,
				`${emojis.custom.info} **Status:** ${enabled ? 'Allowed' : 'Revoked / Not Granted'}`,
				`${emojis.custom.owner || emojis.custom.person} **Changed By:** <@${actorId}>`
			],
			enabled
				? `${emojis.custom.arrowright} This user can now use \`/rpg\` while the RPG System is private.`
				: `${emojis.custom.arrowright} This user cannot use \`/rpg\` unless they are a Cadia developer.`
		],
		footer: `${emojis.custom.clock} Updated <t:${Math.floor(Date.now() / 1000)}:R>`
	});
}

module.exports = {
	UserCommand
};
