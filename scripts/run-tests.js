const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const cliProgress = require('cli-progress');

const root = path.resolve(__dirname, '..');
const testRoot = path.join(root, 'test');
const testFiles = findTestFiles(testRoot);
const startedAt = Date.now();
const failures = [];

if (!testFiles.length) {
	console.log('No test files found.');
	process.exit(0);
}

const progress = new cliProgress.SingleBar(
	{
		format: 'Tests [{bar}] {percentage}% | {value}/{total} files | elapsed {elapsed}s | ETA {eta_formatted} | {file}',
		hideCursor: true,
		clearOnComplete: false,
		barsize: 28
	},
	cliProgress.Presets.shades_classic
);

progress.start(testFiles.length, 0, getProgressPayload('Starting...'));

run().catch((error) => {
	progress.stop();
	console.error(error);
	process.exit(1);
});

async function run() {
	for (const [index, file] of testFiles.entries()) {
		progress.update(index, getProgressPayload(relative(file)));

		const result = await runTestFile(file);
		if (result.code !== 0) failures.push({ file, ...result });

		progress.update(index + 1, getProgressPayload(relative(file)));
	}

	progress.stop();

	const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

	if (failures.length) {
		console.error(`\n${failures.length} test file(s) failed after ${elapsed}s.\n`);

		for (const failure of failures) {
			console.error(`--- ${relative(failure.file)} ---`);
			if (failure.stdout.trim()) console.error(failure.stdout.trim());
			if (failure.stderr.trim()) console.error(failure.stderr.trim());
			console.error('');
		}

		process.exit(1);
	}

	console.log(`\nAll ${testFiles.length} test file(s) passed in ${elapsed}s.`);
}

function runTestFile(file) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, ['--test', file], {
			cwd: root,
			env: process.env,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});

		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});

		child.on('close', (code) => resolve({ code, stdout, stderr }));
	});
}

function findTestFiles(directory) {
	if (!fs.existsSync(directory)) return [];

	const files = [];

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...findTestFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.test.js')) {
			files.push(fullPath);
		}
	}

	return files.sort();
}

function relative(file) {
	return path.relative(root, file);
}

function getProgressPayload(file) {
	return {
		file,
		elapsed: ((Date.now() - startedAt) / 1000).toFixed(1)
	};
}
