const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildMemberUpdate' });
	}

	async run(oldMember, newMember) {
		const { changes, avatarChanged, avatarURL } = collectMemberChanges(oldMember, newMember);
		if (!changes.length) return;

		await sendAuditLog(
			newMember.guild,
			'memberUpdate',
			'Member Updated',
			[{ label: 'User', value: `${newMember.user} (${newMember.id})`, icon: emojis.custom.person }, ...changes],
			{ color: color.warning, emoji: emojis.custom.person, member: newMember, ...(avatarChanged && avatarURL ? { thumbnailURL: avatarURL } : {}) }
		);
	}
}

function collectMemberChanges(oldMember, newMember) {
	const changes = [];
	const avatarChanged = oldMember.user?.avatar !== newMember.user?.avatar || oldMember.avatar !== newMember.avatar;
	const avatarURL = avatarChanged
		? newMember.displayAvatarURL?.({ extension: 'png', size: 1024 }) || newMember.user?.displayAvatarURL?.({ extension: 'png', size: 1024 }) || null
		: null;
	if (avatarChanged) changes.push({ label: 'Avatar Updated', value: avatarURL ? `[View New Avatar](${avatarURL})` : 'The member changed their avatar.' });
	if (oldMember.nickname !== newMember.nickname)
		changes.push({ label: 'Nickname', value: `${oldMember.nickname || 'None'} -> ${newMember.nickname || 'None'}` });

	// Avatar updates can include an incomplete old member role cache. Treating that
	// snapshot as authoritative creates false "Roles Added" entries.
	if (!avatarChanged && !oldMember.partial && !newMember.partial) {
		const oldRoles = new Set(oldMember.roles.cache.keys());
		const newRoles = new Set(newMember.roles.cache.keys());
		const added = [...newRoles].filter((roleId) => !oldRoles.has(roleId));
		const removed = [...oldRoles].filter((roleId) => !newRoles.has(roleId));
		if (added.length) changes.push({ label: 'Roles Added', value: added.map((roleId) => `<@&${roleId}>`).join(', ') });
		if (removed.length) changes.push({ label: 'Roles Removed', value: removed.map((roleId) => `<@&${roleId}>`).join(', ') });
	}
	return { changes, avatarChanged, avatarURL };
}

module.exports = { UserEvent, collectMemberChanges };
