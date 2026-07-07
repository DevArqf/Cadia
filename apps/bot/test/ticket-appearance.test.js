const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'owner';
process.env.DEVELOPERS ??= 'developer';

const { normalizeTicketAppearance } = require('../src/lib/tickets/appearance');
const { buildCloseTicketModal, buildTicketPanel, buildTicketWelcomePayload, ticketWelcomeEmbed } = require('../src/lib/util/ticketSystem');

test('ticket appearance normalizes both customizable embeds', () => {
	const appearance = normalizeTicketAppearance({
		panel: { title: 'Support', color: '#AABBCC', imageUrl: 'https://example.com/panel.png', buttonLabel: 'Create' },
		openedTicket: { title: 'Case {ticketNumber}', footer: 'Opened by {username}', showTimestamp: true }
	});
	assert.equal(appearance.panel.color, '#aabbcc');
	assert.equal(appearance.panel.buttonLabel, 'Create');
	assert.equal(appearance.openedTicket.showTimestamp, true);
});

test('created ticket messages support Components V2 separator directives', () => {
	const user = { id: '12345678901234567', username: 'tester', toString: () => '<@12345678901234567>' };
	const payload = buildTicketWelcomePayload(user, { ticketNumber: 7, createdAt: Date.now() }, {
		staffRoleIds: [], panel: { title: 'Support' },
		openedTicket: { title: 'Ticket {ticketNumber}', description: 'First\n{separator}\nSecond <:wave:12345678901234567>', color: '#445566', style: 'componentsV2' }
	});
	assert.ok(payload.flags);
	assert.doesNotThrow(() => payload.components[0].toJSON());
});

test('ticket panels support select menus, Components V2, and optional close reasons', () => {
	const payload = buildTicketPanel({
		maxOpenTickets: 1,
		panel: { title: '**Support**', description: '> Choose an option', color: '#123456', style: 'componentsV2', controlType: 'select', buttonLabel: 'Open support', buttonEmoji: '📨' }
	});
	assert.ok(payload.flags);
	assert.equal(payload.components.length, 1);
	assert.doesNotThrow(() => payload.components[0].toJSON());
	const modal = buildCloseTicketModal().toJSON();
	assert.equal(modal.components[0].components[0].required, false);
});

test('ticket panel and created-ticket payloads render saved templates', () => {
	const config = {
		maxOpenTickets: 2,
		panel: { title: 'Support', description: 'Limit {maxOpen}', footer: 'Panel', color: '#112233', buttonLabel: 'Open Case', buttonEmoji: '📨' },
		openedTicket: { title: 'Case {ticketNumber}', description: 'Welcome {username} at {created}', footer: '{panelTitle}', color: '#445566' }
	};
	const panel = buildTicketPanel(config);
	assert.equal(panel.embeds[0].data.description, 'Limit 2');
	assert.equal(panel.components[0].components[0].data.label, 'Open Case');

	const user = { id: '12345678901234567', username: 'tester', toString: () => '<@12345678901234567>' };
	const opened = ticketWelcomeEmbed(user, { ticketNumber: 42, createdAt: 1_700_000_000_000 }, config);
	assert.equal(opened.data.title, 'Case 42');
	assert.match(opened.data.description, /Welcome tester/);
	assert.equal(opened.data.footer.text, 'Support');
});
