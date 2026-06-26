const { OAuth2Scopes, PermissionFlagsBits } = require('discord.js');
const { branding } = require('./branding');

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
	const configuredUrl = process.env.CADIA_ALL_FEATURES_OAUTH_URL || process.env.CADIA_INVITE_URL || '';
	if (!configuredUrl) return '';

	const url = new URL(configuredUrl);
	url.searchParams.set('client_id', normalizeClientId(url.searchParams.get('client_id')));
	if (!url.searchParams.get('scope')) url.searchParams.set('scope', 'bot applications.commands');
	return url.toString();
}

function normalizeClientId(value) {
	const candidate = value?.trim();
	if (!candidate || candidate === 'your_bot_application_id' || !/^\d{17,22}$/.test(candidate)) return branding.applicationId;
	return candidate;
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
