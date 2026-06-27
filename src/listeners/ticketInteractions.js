const { Listener } = require('@sapphire/framework');
const { Events } = require('discord.js');
const { TICKET_CLAIM_ID, TICKET_CLOSE_ID, TICKET_OPEN_ID, claimTicket, closeTicket, createTicket } = require('../lib/util/ticketSystem');

class UserEvent extends Listener {
	constructor(context) {
		super(context, {
			event: Events.InteractionCreate
		});
	}

	async run(interaction) {
		if (!interaction.isButton() || !interaction.inGuild()) return;

		if (interaction.customId === TICKET_OPEN_ID) return createTicket(interaction);
		if (interaction.customId === TICKET_CLAIM_ID) return claimTicket(interaction);
		if (interaction.customId === TICKET_CLOSE_ID) return closeTicket(interaction, 'Closed from ticket controls.');
	}
}

module.exports = {
	UserEvent
};
