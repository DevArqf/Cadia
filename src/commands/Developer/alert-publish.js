const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { emojis } = require('../../config');
const { PermissionLevels } = require('../../lib/types/Enums');
const { componentReply } = require('../../lib/util/globalAlerts');
const { notice } = require('../../lib/util/components');
const { addDraftOptions, publishDraft, readDraft, resolveDraftVariables } = require('../../lib/util/alertCommandUtils');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Publish a Cadia global alert'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			addDraftOptions(builder.setName('alert-publish').setDescription(this.description), { messageRequired: true })
		);
	}

	async chatInputRun(interaction) {
		const draft = resolveDraftVariables(readDraft(interaction), interaction.client);
		const dmUsers = interaction.options.getBoolean('dm-users') ?? false;
		const exportCsv = interaction.options.getBoolean('export-csv') ?? false;

		if (draft.message === '') {
			return interaction.reply(componentReply(notice(`${emojis.custom.warning} **Empty Alert**`, 'The alert message cannot be empty.')));
		}

		return publishDraft(interaction, draft, dmUsers, false, { exportCsv });
	}
}

module.exports = {
	UserCommand
};
