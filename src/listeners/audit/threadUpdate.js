const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'threadUpdate' });
	}

	async run(oldThread, newThread) {
		if (!newThread.guild) return;

		const changes = threadChanges(oldThread, newThread);
		if (!changes.length) return;

		await sendAuditLog(
			newThread.guild,
			'threadUpdate',
			'Thread Updated',
			[{ label: 'Thread', value: `${newThread} (${newThread.id})`, icon: emojis.custom.openfolder }, ...changes],
			{ color: color.warning, emoji: emojis.custom.pencil }
		);
	}
}

function threadChanges(oldThread, newThread) {
	const changes = [];
	if (oldThread.name !== newThread.name) changes.push({ label: 'Name', value: `${oldThread.name} -> ${newThread.name}` });
	if (oldThread.parentId !== newThread.parentId)
		changes.push({ label: 'Parent Channel', value: `${formatParent(oldThread)} -> ${formatParent(newThread)}` });
	if (oldThread.archived !== newThread.archived) changes.push({ label: 'Archived', value: `${oldThread.archived} -> ${newThread.archived}` });
	if (oldThread.locked !== newThread.locked) changes.push({ label: 'Locked', value: `${oldThread.locked} -> ${newThread.locked}` });
	if (oldThread.invitable !== newThread.invitable) changes.push({ label: 'Invitable', value: `${oldThread.invitable} -> ${newThread.invitable}` });
	if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration)
		changes.push({
			label: 'Auto Archive',
			value: `${oldThread.autoArchiveDuration || 'Unknown'} min -> ${newThread.autoArchiveDuration || 'Unknown'} min`
		});
	if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser)
		changes.push({ label: 'Slowmode', value: `${oldThread.rateLimitPerUser || 0}s -> ${newThread.rateLimitPerUser || 0}s` });
	return changes;
}

function formatParent(thread) {
	if (thread.parent) return `${thread.parent} (${thread.parentId})`;
	return thread.parentId || 'Unknown';
}

module.exports = { UserEvent };
