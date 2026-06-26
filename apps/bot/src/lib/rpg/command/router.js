async function dispatchRpgCommand(interaction, handlers, service) {
	const group = interaction.options.getSubcommandGroup(false);
	const subcommand = interaction.options.getSubcommand();

	if (group === 'admin') return handlers.admin(interaction, subcommand);
	if (subcommand !== 'tutorial' && (await service.shouldOfferTutorial(interaction.guild.id, interaction.user.id))) {
		return handlers.offerTutorial(interaction);
	}

	const handler = handlers[subcommand];
	if (!handler) throw new service.RpgError(`Unsupported RPG subcommand: ${subcommand}`);
	return handler(interaction);
}

module.exports = {
	dispatchRpgCommand
};
