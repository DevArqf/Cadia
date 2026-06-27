const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'threadDelete' });
	}

	async run(thread) {
		if (!thread.guild) return;

		await sendAuditLog(thread.guild, 'threadDelete', 'Thread Deleted', threadDetails(thread), {
			color: color.fail,
			emoji: emojis.custom.trash
		});
	}
}

function threadDetails(thread) {
	return [
		{ label: 'Name', value: thread.name, icon: emojis.custom.openfolder },
		{ label: 'Thread ID', value: thread.id },
		{ label: 'Parent Channel', value: formatParent(thread) },
		{ label: 'Owner ID', value: thread.ownerId || 'Unknown' },
		{ label: 'Archived', value: thread.archived ?? 'Unknown' },
		{ label: 'Locked', value: thread.locked ?? 'Unknown' }
	];
}

function formatParent(thread) {
	if (thread.parent) return `${thread.parent} (${thread.parentId})`;
	return thread.parentId || 'Unknown';
}

module.exports = { UserEvent };
