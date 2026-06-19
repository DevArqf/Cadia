const { OAuth2Scopes, PermissionFlagsBits } = require('discord.js');

const inviteScopes = [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands];
const invitePermissions = [
	PermissionFlagsBits.ViewChannel,
	PermissionFlagsBits.SendMessages,
	PermissionFlagsBits.EmbedLinks,
	PermissionFlagsBits.AttachFiles,
	PermissionFlagsBits.ReadMessageHistory,
	PermissionFlagsBits.AddReactions,
	PermissionFlagsBits.UseExternalEmojis,
	PermissionFlagsBits.ManageMessages,
	PermissionFlagsBits.KickMembers,
	PermissionFlagsBits.BanMembers,
	PermissionFlagsBits.ModerateMembers,
	PermissionFlagsBits.ManageNicknames,
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ManageRoles,
	PermissionFlagsBits.ManageGuildExpressions
];

function createInviteUrl(client) {
	return client.generateInvite({
		scopes: inviteScopes,
		permissions: invitePermissions
	});
}

module.exports = {
	createInviteUrl,
	invitePermissions,
	inviteScopes
};
