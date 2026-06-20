const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('global blacklist precondition queries the blacklist model', () => {
	const source = read('src/preconditions/global/Blacklist.js');

	assert.match(source, /getGuildBlacklist\(guildId, userId\)/);
	assert.doesNotMatch(source, /return true;\s*\/\/ TODO: Implement this/);
});

test('blacklist add validates the raw guild id before reading cached guild properties', () => {
	const source = read('src/commands/Systems/Blacklist/blacklist-add.js');
	const validationIndex = source.indexOf('if (!/^\\d{17,20}$/.test(guildId))');
	const databaseLookupIndex = source.indexOf('Guild.findOne({ guildId })');
	const cacheLookupIndex = source.indexOf('guilds.cache.get(guildId)');

	assert.ok(validationIndex >= 0);
	assert.ok(databaseLookupIndex > validationIndex);
	assert.ok(cacheLookupIndex > databaseLookupIndex);
	assert.doesNotMatch(source, /Guild\.findOne\(\{\s*guildId:\s*targetGuild\.id\s*\}\)/);
});

test('automod command awaits rule creation without delayed interaction edits', () => {
	const source = read('src/commands/Systems/Automod/automod.js');

	assert.match(source, /await interaction\.deferReply\(\)/);
	assert.match(source, /await interaction\.guild\.autoModerationRules\.create/);
	assert.doesNotMatch(source, /setTimeout/);
	assert.doesNotMatch(source, /custommessage/);
	assert.doesNotMatch(source, /createId/);
});

test('activity rotation uses one managed interval and client shutdown clears timers', () => {
	const readySource = read('src/listeners/ready.js');
	const clientSource = read('src/lib/CadiaClient.js');

	assert.match(readySource, /client\.activityRotationTimer = setInterval/);
	assert.doesNotMatch(readySource, /setTimeout/);
	assert.match(clientSource, /clearInterval\(this\.activityRotationTimer\)/);
	assert.match(clientSource, /clearInterval\(this\.topggStatsPoster\)/);
	assert.match(clientSource, /clearInterval\(this\.reminderTimer\)/);
	const indexSource = read('src/index.js');
	assert.match(indexSource, /client\.reminderTimer = setInterval/);
	assert.doesNotMatch(indexSource, /\.send\([\s\S]*?\)\s*\.catch\(\(\) => null\)/);
});

test('partial message updates and transient database DNS failures are handled', () => {
	const messageUpdateSource = read('src/listeners/messages/messageUpdate.js');
	const mysqlSource = read('src/lib/database/mysql.js');

	assert.match(messageUpdateSource, /if \(!message\.author \|\| message\.author\.bot\) return/);
	assert.match(mysqlSource, /'EAI_AGAIN'/);
	assert.match(mysqlSource, /'ENOTFOUND'/);
});

test('ban and timeout moderation commands use the correct Discord semantics', () => {
	const banSource = read('src/commands/Moderation/ban.js');
	const moderateNameSource = read('src/commands/Moderation/moderate-name.js');
	const muteSource = read('src/commands/Moderation/mute.js');
	const unmuteSource = read('src/commands/Moderation/unmute.js');

	assert.match(banSource, /capability:\s*'bannable'/);
	assert.match(banSource, /if \(evidence\) embed\.setImage\(evidence\.url\)/);
	assert.doesNotMatch(banSource, /Number\.isNaN\(.*userid/);
	assert.match(moderateNameSource, /capability:\s*'manageable'/);
	assert.match(moderateNameSource, /member\.setNickname/);
	assert.match(muteSource, /capability:\s*'moderatable'/);
	assert.match(muteSource, /member\.isCommunicationDisabled\(\)/);
	assert.match(unmuteSource, /member\.timeout\(null, reason\)/);
});

test('large command modules delegate to focused feature modules', () => {
	const rpgCommand = read('src/commands/Systems/RPG System/rpg.js');
	const rpgService = read('src/lib/rpg/service.js');
	const minigameCommand = read('src/commands/Systems/Minigame/minigame.js');

	assert.ok(rpgCommand.split(/\r?\n/).length < 2100);
	assert.match(rpgCommand, /registerRpgCommand/);
	assert.match(rpgCommand, /dispatchRpgCommand/);
	assert.match(rpgCommand, /createBattleFlow/);
	assert.match(rpgCommand, /createPlayerGrowthHandlers/);
	assert.ok(rpgService.split(/\r?\n/).length < 100);
	assert.ok(minigameCommand.split(/\r?\n/).length < 100);
	assert.match(minigameCommand, /runGamecordGame/);
	assert.match(minigameCommand, /runCustomGame/);
});

test('Sapphire custom templates live at the configured project location', () => {
	const sapphireConfig = JSON.parse(read('.sapphirerc.json'));
	const templateDirectory = sapphireConfig.customFileTemplates.location;

	assert.equal(templateDirectory, 'templates');
	assert.equal(fs.existsSync(path.join(root, templateDirectory, 'cmd.js.sapphire')), true);
});

function read(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
