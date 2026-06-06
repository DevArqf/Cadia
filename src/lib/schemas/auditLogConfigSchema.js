const { createModel } = require('../database/model');

const AuditLogConfigSchema = createModel('auditLogConfigSchema', {
	guildId: null,
	channelId: null,
	enabled: false,
	events: () => ({
		messageUpdate: true,
		messageDelete: true,
		messageDeleteBulk: true,
		memberAdd: true,
		memberRemove: true,
		memberUpdate: true,
		banAdd: true,
		banRemove: true,
		channelCreate: true,
		channelUpdate: true,
		channelDelete: true,
		roleCreate: true,
		roleUpdate: true,
		roleDelete: true,
		voiceJoin: true,
		voiceLeave: true,
		voiceMove: true,
		voiceUpdate: true,
		inviteCreate: true,
		inviteDelete: true,
		emojiCreate: true,
		emojiUpdate: true,
		emojiDelete: true,
		stickerCreate: true,
		stickerUpdate: true,
		stickerDelete: true,
		commandUse: true,
		guildUpdate: true
	}),
	createdAt: () => Date.now(),
	updatedAt: () => Date.now()
});

module.exports = {
	AuditLogConfigSchema
};
