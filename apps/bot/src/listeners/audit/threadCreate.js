const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'threadCreate' });
	}

	async run(thread) {
		if (!thread.guild) return;

		await sendAuditLog(thread.guild, 'threadCreate', 'Thread Created', threadDetails(thread), {
			color: color.success,
			emoji: emojis.custom.openfolder
		});
	}
}

function threadDetails(thread) {
	return [
		{ label: 'Thread', value: `${thread} (${thread.id})`, icon: emojis.custom.openfolder },
		{ label: 'Name', value: thread.name },
		{ label: 'Parent Channel', value: formatParent(thread) },
		{ label: 'Owner ID', value: thread.ownerId || 'Unknown' },
		{ label: 'Archived', value: thread.archived ?? 'Unknown' },
		{ label: 'Locked', value: thread.locked ?? 'Unknown' },
		{ label: 'Auto Archive', value: thread.autoArchiveDuration ? `${thread.autoArchiveDuration} minutes` : 'Unknown' },
		{ label: 'Slowmode', value: `${thread.rateLimitPerUser || 0}s` }
	];
}

function formatParent(thread) {
	if (thread.parent) return `${thread.parent} (${thread.parentId})`;
	return thread.parentId || 'Unknown';
}

module.exports = { UserEvent };
