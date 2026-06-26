const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(root, '..', '..');
const defaultFastTests = [
	'test/config-modules.test.js',
	'test/hot-reload-runtime.test.js',
	'test/ipc.test.js',
	'test/performance-critical-paths.test.js',
	'test/prefix-commands.test.js'
];
const changeMap = [
	{ pattern: /^src\/lib\/runtime\//, tests: ['test/hot-reload-runtime.test.js', 'test/performance-critical-paths.test.js'] },
	{ pattern: /^src\/listeners\/globalInteractions\.js$/, tests: ['test/hot-reload-runtime.test.js', 'test/performance-critical-paths.test.js'] },
	{ pattern: /^src\/lib\/commands\/prefixAdapter\.js$/, tests: ['test/prefix-commands.test.js'] },
	{ pattern: /^src\/config\//, tests: ['test/config-modules.test.js'] }
];
const workspaceChangeMap = [
	{ pattern: /^libs\/ipc\//, tests: ['test/ipc.test.js'] },
	{ pattern: /^apps\/dashboard\//, tests: ['test/ipc.test.js'] }
];

const requested = process.argv.slice(2).filter(Boolean);
const tests = requested.length ? requested : selectFastTests();

if (!tests.length) {
	console.log('No fast tests selected.');
	process.exit(0);
}

const existingTests = tests.map((file) => path.resolve(root, file)).filter((file) => fs.existsSync(file));
if (!existingTests.length) {
	console.log('No selected fast test files exist.');
	process.exit(0);
}

console.log(`Running ${existingTests.length} fast test file(s):`);
for (const file of existingTests) console.log(`- ${path.relative(root, file)}`);

const result = spawnSync(process.execPath, ['--test', ...existingTests], {
	cwd: root,
	stdio: 'inherit',
	env: process.env
});

process.exit(result.status ?? 1);

function selectFastTests() {
	const changedFiles = getChangedFiles();
	const selected = new Set();

	for (const file of changedFiles) {
		const botFile = file.startsWith('apps/bot/') ? file.slice('apps/bot/'.length) : file;

		if (/^test\/.+\.test\.js$/.test(botFile)) selected.add(botFile);
		for (const entry of changeMap) {
			if (entry.pattern.test(botFile)) {
				for (const test of entry.tests) selected.add(test);
			}
		}
		for (const entry of workspaceChangeMap) {
			if (entry.pattern.test(file)) {
				for (const test of entry.tests) selected.add(test);
			}
		}
	}

	if (selected.size) return [...selected].sort();
	return defaultFastTests;
}

function getChangedFiles() {
	const files = new Set();
	for (const args of [
		['diff', '--name-only', 'HEAD', '--'],
		['ls-files', '--others', '--exclude-standard']
	]) {
		const result = spawnSync('git', args, { cwd: workspaceRoot, encoding: 'utf8' });
		if (result.status !== 0) continue;
		for (const line of result.stdout.split(/\r?\n/)) {
			const normalized = line.trim().replace(/\\/g, '/');
			if (normalized) files.add(normalized);
		}
	}
	return [...files];
}
