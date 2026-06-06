const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'roleUpdate' });
	}

	async run(oldRole, newRole) {
		const changes = [];
		if (oldRole.name !== newRole.name) changes.push({ label: 'Name', value: `${oldRole.name} -> ${newRole.name}` });
		if (oldRole.hexColor !== newRole.hexColor) changes.push({ label: 'Color', value: `${oldRole.hexColor} -> ${newRole.hexColor}` });
		if (oldRole.hoist !== newRole.hoist) changes.push({ label: 'Hoisted', value: `${oldRole.hoist} -> ${newRole.hoist}` });
		if (oldRole.mentionable !== newRole.mentionable)
			changes.push({ label: 'Mentionable', value: `${oldRole.mentionable} -> ${newRole.mentionable}` });
		if (!changes.length) return;

		await sendAuditLog(
			newRole.guild,
			'roleUpdate',
			'Role Updated',
			[{ label: 'Role', value: `${newRole} (${newRole.id})`, icon: emojis.custom.crown }, ...changes],
			{ color: color.warning, emoji: emojis.custom.pencil }
		);
	}
}

module.exports = { UserEvent };
