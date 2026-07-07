const { Listener } = require('@sapphire/framework');
const { Events } = require('discord.js');
const { TICKET_CLAIM_ID, TICKET_CLOSE_ID, TICKET_CLOSE_SUBMIT_ID, TICKET_OPEN_ID, buildCloseTicketModal, claimTicket, closeTicket, createTicket } = require('../lib/util/ticketSystem');
const { getGuildCommandConfig, isModuleEnabled } = require('../lib/runtime/guildCommandConfig');
const { replyModuleDisabled } = require('../lib/runtime/interactionRouter');

class UserEvent extends Listener {
	constructor(context) {
		super(context, {
			event: Events.InteractionCreate
		});
	}

	async run(interaction) {
		if (!(interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) || !interaction.inGuild()) return;
		if (![TICKET_OPEN_ID, TICKET_CLAIM_ID, TICKET_CLOSE_ID, TICKET_CLOSE_SUBMIT_ID].includes(interaction.customId)) return;
		const config = await getGuildCommandConfig(interaction.guildId);
		if (!isModuleEnabled(config, 'tickets')) return replyModuleDisabled(interaction, 'tickets');

		if (interaction.customId === TICKET_OPEN_ID) return createTicket(interaction);
		if (interaction.customId === TICKET_CLAIM_ID) return claimTicket(interaction);
		if (interaction.customId === TICKET_CLOSE_ID) return interaction.showModal(buildCloseTicketModal());
		if (interaction.customId === TICKET_CLOSE_SUBMIT_ID) return closeTicket(interaction, interaction.fields.getTextInputValue('reason') || 'No reason provided.');
	}
}

module.exports = {
	UserEvent
};
