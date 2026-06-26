const { createModel } = require('../database/model');

const TicketConfigSchema = createModel('ticketConfigSchema', {
	guildId: null,
	enabled: false,
	categoryId: null,
	panelChannelId: null,
	panelMessageId: null,
	staffRoleId: null,
	staffRoleIds: () => [],
	logChannelId: null,
	title: 'Need help?',
	description: 'Open a ticket and the support team will help you as soon as possible.',
	maxOpenTickets: 1,
	ticketNameFormat: 'ticket-{username}',
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

const TicketSchema = createModel('ticketSchema', {
	guildId: null,
	channelId: null,
	ownerId: null,
	ticketNumber: 0,
	status: 'open',
	claimedById: null,
	closedById: null,
	closeReason: null,
	participants: () => [],
	createdAt: () => Date.now(),
	updatedAt: () => Date.now(),
	closedAt: null
});

module.exports = {
	TicketConfigSchema,
	TicketSchema
};
