const assert = require('node:assert/strict');
const test = require('node:test');
const { Collection, PermissionFlagsBits } = require('discord.js');
const { normalizeUpdateEmbed, sendAdminUpdate } = require('../src/lib/admin/updateBroadcast');

test('admin update embeds reject empty content and unsafe URLs', () => {
	assert.throws(() => normalizeUpdateEmbed({}), /title, description, or field/i);
	assert.throws(() => normalizeUpdateEmbed({ title: 'Update', imageUrl: 'javascript:alert(1)' }), /valid HTTP or HTTPS URL/i);
	assert.equal(normalizeUpdateEmbed({ title: 'Update', color: '#12ABef' }).color, '#12ABef');
});

test('global updates send only to configured, valid update channels', async () => {
	const sent = [];
	const makeGuild = (id, name) => {
		const channel = {
			id: `channel-${id}`,
			isTextBased: () => true,
			isThread: () => false,
			permissionsFor: () => ({ has: (permissions) => permissions.includes(PermissionFlagsBits.EmbedLinks) }),
			send: async (payload) => {
				sent.push({ id, payload });
				return { id: `message-${id}` };
			}
		};
		return {
			id,
			name,
			members: { me: {} },
			channels: { cache: new Collection([[channel.id, channel]]), fetch: async () => null }
		};
	};
	const configured = makeGuild('1', 'Configured');
	const skipped = makeGuild('2', 'Skipped');
	const client = { guilds: { cache: new Collection([[configured.id, configured], [skipped.id, skipped]]) } };
	const report = await sendAdminUpdate(
		client,
		{ target: 'global', embed: { title: 'Release', description: 'Ready', color: '#65b8da' } },
		async (guildId) => ({ updateChannelId: guildId === configured.id ? 'channel-1' : null })
	);

	assert.equal(report.sent, 1);
	assert.equal(report.skipped, 1);
	assert.equal(report.failed, 0);
	assert.equal(sent.length, 1);
	assert.equal(sent[0].payload.embeds.length, 1);
});
