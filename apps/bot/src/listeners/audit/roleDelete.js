const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'roleDelete' });
	}

	async run(role) {
		await sendAuditLog(
			role.guild,
			'roleDelete',
			'Role Deleted',
			[
				{ label: 'Name', value: role.name, icon: emojis.custom.crown },
				{ label: 'Role ID', value: role.id },
				{ label: 'Color', value: role.hexColor }
			],
			{ color: color.fail, emoji: emojis.custom.trash }
		);
	}
}

module.exports = { UserEvent };
