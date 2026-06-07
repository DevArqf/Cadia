const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const {
	addDraftOptions,
	addTemplateOption,
	applyTemplate,
	previewTemplate,
	readDraft,
	resolveDraftVariables
} = require('../../lib/util/alertCommandUtils');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Preview and edit a premade Cadia alert template'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) => {
			const command = builder.setName('alert-template').setDescription(this.description);
			addTemplateOption(command);
			return addDraftOptions(command);
		});
	}

	async chatInputRun(interaction) {
		const templateKey = interaction.options.getString('template', true);
		const dmUsers = interaction.options.getBoolean('dm-users') ?? false;
		const draft = resolveDraftVariables(applyTemplate(templateKey, readDraft(interaction)), interaction.client);
		return previewTemplate(interaction, draft, dmUsers);
	}
}

module.exports = {
	UserCommand
};
