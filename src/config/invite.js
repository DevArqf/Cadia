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
const invitePermissionPresets = [
	{
		name: 'RPG and Community',
		permissions: invitePermissions.slice(0, 8)
	},
	{
		name: 'RPG and Moderation',
		permissions: invitePermissions.slice(0, 13)
	},
	{
		name: 'All Cadia Features',
		permissions: invitePermissions
	}
].map((preset) => ({
	...preset,
	value: preset.permissions.reduce((total, permission) => total | permission, 0n).toString()
}));

function createInviteUrl(client) {
	return client.generateInvite({
		scopes: inviteScopes,
		permissions: invitePermissions
	});
}

module.exports = {
	createInviteUrl,
	invitePermissionPresets,
	invitePermissions,
	inviteScopes
};
