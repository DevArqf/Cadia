const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const startupScript = path.resolve(__dirname, '../../../scripts/start-cadia.js');

test('Cadia startup script remains valid JavaScript', () => {
	const result = spawnSync(process.execPath, ['--check', startupScript], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
});

test('Cloudflare tunnel failure does not stop bot and dashboard', () => {
	const source = readFileSync(startupScript, 'utf8');

	assert.match(source, /startProcess\('tunnel',[\s\S]*?fatal: false/);
	assert.match(source, /signal !== 'SIGSEGV' \|\| tunnelRecoveryAttempted/);
	assert.match(source, /fs\.rmSync\(cloudflaredBinary, \{ force: true \}\)/);
	assert.match(source, /Bot and dashboard processes will remain running without the tunnel/);
});

test('Cadia startup defaults the dashboard to live development mode', () => {
	const source = readFileSync(startupScript, 'utf8');

	assert.match(source, /DASHBOARD_MODE \|\| 'development'/);
	assert.match(source, /Dashboard live mode enabled/);
	assert.match(source, /'--hostname',[\s\S]*?'--port'/);
	assert.match(source, /if \(!fs\.existsSync\(dashboardServer\)\) await installAndBuildDashboard\(\)/);
});
