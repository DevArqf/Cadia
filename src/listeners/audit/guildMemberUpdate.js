const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildMemberUpdate' });
	}

	async run(oldMember, newMember) {
		const changes = [];
		if (oldMember.nickname !== newMember.nickname)
			changes.push({ label: 'Nickname', value: `${oldMember.nickname || 'None'} -> ${newMember.nickname || 'None'}` });

		const oldRoles = new Set(oldMember.roles.cache.keys());
		const newRoles = new Set(newMember.roles.cache.keys());
		const added = [...newRoles].filter((roleId) => !oldRoles.has(roleId));
		const removed = [...oldRoles].filter((roleId) => !newRoles.has(roleId));
		if (added.length) changes.push({ label: 'Roles Added', value: added.map((roleId) => `<@&${roleId}>`).join(', ') });
		if (removed.length) changes.push({ label: 'Roles Removed', value: removed.map((roleId) => `<@&${roleId}>`).join(', ') });
		if (!changes.length) return;

		await sendAuditLog(
			newMember.guild,
			'memberUpdate',
			'Member Updated',
			[{ label: 'User', value: `${newMember.user} (${newMember.id})`, icon: emojis.custom.person }, ...changes],
			{ color: color.warning, emoji: emojis.custom.person, member: newMember }
		);
	}
}

module.exports = { UserEvent };
