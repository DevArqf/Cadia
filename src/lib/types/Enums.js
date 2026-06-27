/**
 * @enum {number}
 * @readonly
 * @property {number} Everyone - No special permissions, accessible by everyone.
 * @property {number} Trainee - Permissions for Trainees.
 * @property {number} Staff - Permissions for Staff.
 * @property {number} Moderator - Permissions for Moderators.
 * @property {number} Administrator - Permissions for Administrators.
 * @property {number} ServerOwner - Permissions for Server Owners.
 * @property {number} Developer - Permissions for Developers
 * @property {number} BotOwner - Permissions for Bot Owners.
 * @description Represents permission levels for commands.
 */
const PermissionLevels = {
	Everyone: 0,
	Staff: 4,
	Moderator: 5,
	Administrator: 6,
	ServerOwner: 7,
	Developer: 9,
	BotOwner: 10
};

module.exports = {
	PermissionLevels
};
