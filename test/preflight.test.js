const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

test('all source JavaScript files pass node syntax checks', () => {
	const files = getSourceFiles();
	const failures = [];

	for (const file of files) {
		const result = spawnSync(process.execPath, ['--check', file], {
			cwd: root,
			encoding: 'utf8'
		});

		if (result.status !== 0) {
			failures.push(`${relative(file)}\n${result.stderr || result.stdout}`);
		}
	}

	assert.deepEqual(failures, []);
});

test('runtime modules load without throwing before bot login', () => {
	const files = getSourceFiles().filter((file) => {
		const relativePath = relative(file).replaceAll('\\', '/');
		return !['src/index.js', 'src/lib/util/setup.js'].includes(relativePath);
	});
	const failures = [];

	for (const file of files) {
		try {
			require(file);
		} catch (error) {
			failures.push(`${relative(file)}: ${error.stack || error.message}`);
		}
	}

	assert.deepEqual(failures, []);
});

test('command files export UserCommand and do not duplicate explicit slash command names', () => {
	const commandFiles = getSourceFiles(path.join(src, 'commands'));
	const missingExports = [];
	const names = new Map();
	const duplicates = [];

	for (const file of commandFiles) {
		const exported = require(file);
		if (!exported.UserCommand) missingExports.push(relative(file));

		const explicitName = getExplicitCommandName(file);
		if (!explicitName) continue;

		if (names.has(explicitName)) {
			duplicates.push(`${explicitName}: ${names.get(explicitName)} and ${relative(file)}`);
		} else {
			names.set(explicitName, relative(file));
		}
	}

	assert.deepEqual(missingExports, []);
	assert.deepEqual(duplicates, []);
});

test('project source does not contain deprecated interaction response options', () => {
	const matches = grepSource(/\bephemeral\s*:/);
	assert.deepEqual(matches, []);
});

test('project source does not register permanent runtime interactionCreate listeners', () => {
	const matches = grepSource(/\b(?:client|message\.client|interaction\.client)\.on\(['"]interactionCreate['"]/);
	assert.deepEqual(matches, []);
});

test('renamed brand and emoji keys do not regress', () => {
	const matches = grepSource(/\bBeemo\b|\breplystart\b|\breplycontinue\b|\breplyend\b/);
	assert.deepEqual(matches, []);
});

test('required package scripts exist for public preflight startup', () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

	assert.equal(pkg.scripts.test, 'node scripts/run-tests.js');
	assert.equal(pkg.scripts['check:cycles'], 'madge --circular src');
	assert.equal(pkg.scripts.prestart, 'npm test');
	assert.equal(pkg.scripts.start, 'node src/index.js');
});

test('canvas rank card dependency can render before public startup', () => {
	const { createCanvas } = require('@napi-rs/canvas');
	const canvas = createCanvas(160, 48);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = '#65b8da';
	ctx.fillRect(0, 0, 160, 48);

	assert.ok(canvas.toBuffer('image/png').length > 0);
});

function getSourceFiles(base = src) {
	const files = [];

	for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
		const fullPath = path.join(base, entry.name);
		if (entry.isDirectory()) {
			files.push(...getSourceFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			files.push(fullPath);
		}
	}

	return files;
}

function getExplicitCommandName(file) {
	const sourceCode = fs.readFileSync(file, 'utf8');
	const registrationStart = sourceCode.indexOf('registerChatInputCommand');
	if (registrationStart === -1) return null;

	const registrationSource = sourceCode.slice(registrationStart);
	const nextNestedBuilder = registrationSource.search(
		/\.(?:addSubcommand|addSubcommandGroup|addStringOption|addUserOption|addIntegerOption|addChannelOption|addAttachmentOption|addBooleanOption|addRoleOption|addNumberOption)\(/
	);
	const topLevelBuilder = nextNestedBuilder === -1 ? registrationSource : registrationSource.slice(0, nextNestedBuilder);
	const match = topLevelBuilder.match(/\.setName\(['"]([^'"]+)['"]\)/);
	return match?.[1] ?? null;
}

function grepSource(pattern) {
	const matches = [];

	for (const file of getSourceFiles()) {
		const sourceCode = fs.readFileSync(file, 'utf8');
		const lines = sourceCode.split(/\r?\n/);

		lines.forEach((line, index) => {
			if (pattern.test(line)) matches.push(`${relative(file)}:${index + 1}: ${line.trim()}`);
		});
	}

	return matches;
}

function relative(file) {
	return path.relative(root, file);
}
