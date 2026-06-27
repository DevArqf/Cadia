const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'guildUpdate' });
	}

	async run(oldGuild, newGuild) {
		const changes = [];
		if (oldGuild.name !== newGuild.name) changes.push({ label: 'Name', value: `${oldGuild.name} -> ${newGuild.name}` });
		if (oldGuild.icon !== newGuild.icon) changes.push({ label: 'Icon', value: 'Server icon changed.' });
		if (oldGuild.banner !== newGuild.banner) changes.push({ label: 'Banner', value: 'Server banner changed.' });
		if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
			changes.push({ label: 'Verification Level', value: `${oldGuild.verificationLevel} -> ${newGuild.verificationLevel}` });
		}
		if (!changes.length) return;
		await sendAuditLog(newGuild, 'guildUpdate', 'Server Updated', changes, { color: color.warning, emoji: emojis.custom.settings });
	}
}

module.exports = { UserEvent };
