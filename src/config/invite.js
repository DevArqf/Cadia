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
		id: 'rpg-community',
		name: 'RPG and Community',
		permissions: invitePermissions.slice(0, 8)
	},
	{
		id: 'rpg-moderation',
		name: 'RPG and Moderation',
		permissions: invitePermissions.slice(0, 13)
	},
	{
		id: 'all-features',
		name: 'All Cadia Features',
		permissions: invitePermissions
	}
].map((preset) => ({
	...preset,
	value: preset.permissions.reduce((total, permission) => total | permission, 0n).toString()
}));

function createInviteUrl(client) {
	const configuredInviteUrl = getAllFeaturesOAuthUrl();
	if (configuredInviteUrl) return configuredInviteUrl;

	return client.generateInvite({
		scopes: inviteScopes,
		permissions: invitePermissions
	});
}

function getAllFeaturesOAuthUrl() {
	return process.env.CADIA_ALL_FEATURES_OAUTH_URL || process.env.CADIA_INVITE_URL || '';
}

function isAllFeaturesPreset(value) {
	return invitePermissionPresets.some((preset) => preset.id === 'all-features' && preset.value === value);
}

module.exports = {
	createInviteUrl,
	getAllFeaturesOAuthUrl,
	isAllFeaturesPreset,
	invitePermissionPresets,
	invitePermissions,
	inviteScopes
};
