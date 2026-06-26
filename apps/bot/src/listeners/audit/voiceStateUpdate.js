const { Listener } = require('@sapphire/framework');
const { color, emojis } = require('../../config');
const { sendAuditLog } = require('../../lib/util/auditLogger');

class UserEvent extends Listener {
	constructor(context) {
		super(context, { event: 'voiceStateUpdate' });
	}

	async run(oldState, newState) {
		const guild = newState.guild || oldState.guild;
		const details = [
			{ label: 'User', value: `${newState.member?.user || oldState.member?.user} (${newState.id || oldState.id})`, icon: emojis.custom.person }
		];
		let eventKey = null;
		let title = null;

		if (!oldState.channelId && newState.channelId) {
			eventKey = 'voiceJoin';
			title = 'Voice Joined';
			details.push({ label: 'Channel', value: `<#${newState.channelId}>`, icon: emojis.custom.openfolder });
		} else if (oldState.channelId && !newState.channelId) {
			eventKey = 'voiceLeave';
			title = 'Voice Left';
			details.push({ label: 'Channel', value: `<#${oldState.channelId}>`, icon: emojis.custom.openfolder });
		} else if (oldState.channelId !== newState.channelId) {
			eventKey = 'voiceMove';
			title = 'Voice Moved';
			details.push({ label: 'From', value: `<#${oldState.channelId}>`, icon: emojis.custom.openfolder });
			details.push({ label: 'To', value: `<#${newState.channelId}>`, icon: emojis.custom.success });
		} else if (oldState.mute !== newState.mute || oldState.deaf !== newState.deaf || oldState.streaming !== newState.streaming) {
			eventKey = 'voiceUpdate';
			title = 'Voice State Updated';
			details.push({ label: 'Muted', value: `${oldState.mute} -> ${newState.mute}` });
			details.push({ label: 'Deafened', value: `${oldState.deaf} -> ${newState.deaf}` });
			details.push({ label: 'Streaming', value: `${oldState.streaming} -> ${newState.streaming}` });
		}

		if (!title) return;
		await sendAuditLog(guild, eventKey, title, details, {
			color: color.default,
			emoji: emojis.custom.info,
			member: newState.member || oldState.member
		});
	}
}

module.exports = { UserEvent };
