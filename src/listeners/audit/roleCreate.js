const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'roleCreate' });
	}

	async run(role) {
		await sendAuditLog(role.guild, 'roleCreate', 'Role Created', roleDetails(role), { color: color.success, emoji: emojis.custom.crown });
	}
}

function roleDetails(role) {
	return [
		{ label: 'Role', value: `${role} (${role.id})`, icon: emojis.custom.crown },
		{ label: 'Name', value: role.name },
		{ label: 'Color', value: role.hexColor }
	];
}

module.exports = { UserEvent };
