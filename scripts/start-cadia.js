const { spawn } = require('node:child_process');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboardStandaloneRoot = path.join(root, 'apps', 'dashboard', '.next', 'standalone');
const dashboardStandaloneAppRoot = path.join(dashboardStandaloneRoot, 'apps', 'dashboard');
const dashboardServer = path.join(root, 'apps', 'dashboard', '.next', 'standalone', 'apps', 'dashboard', 'server.js');
const runtimeDir = path.join(root, '.runtime');
const cloudflaredBinary = path.join(runtimeDir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const children = new Map();
let shuttingDown = false;
let tunnelRecoveryAttempted = false;

loadDotEnv(path.join(root, '.env'));
const dashboardMode = normalizeDashboardMode(process.env.DASHBOARD_MODE || 'development');
process.env.NODE_ENV ||= 'production';
process.env.PORT ||= process.env.DASHBOARD_PORT || '3000';
process.env.HOSTNAME = process.env.DASHBOARD_HOST || '0.0.0.0';

main().catch((error) => {
	console.error(`[startup] Fatal startup error: ${error.message}`);
	process.exit(1);
});

async function main() {
	startProcess('bot', process.execPath, ['apps/bot/src/index.js']);
	if (dashboardMode === 'development') {
		console.log('[startup] Dashboard live mode enabled. Source changes will refresh without rebuilding.');
		startProcess(
			'dashboard',
			getNpmCommand(),
			[
				'--workspace',
				'@cadia/dashboard',
				'run',
				'dev',
				'--',
				'--hostname',
				process.env.HOSTNAME,
				'--port',
				process.env.PORT
			],
			{ env: { NODE_ENV: 'development' } }
		);
	} else {
		if (!fs.existsSync(dashboardServer)) await installAndBuildDashboard();
		normalizeDashboardAssets();
		startProcess('dashboard', process.execPath, [dashboardServer], { cwd: dashboardStandaloneRoot });
	}

	const token = readCloudflaredToken();
	if (!token) {
		console.warn('[startup] Cloudflare tunnel skipped: set CLOUDFLARED_TOKEN or create .cloudflared-token.');
		return;
	}

	await startTunnel(token);
}

function normalizeDashboardMode(value) {
	const mode = String(value || '').trim().toLowerCase();
	if (['dev', 'development', 'live'].includes(mode)) return 'development';
	if (['prod', 'production'].includes(mode)) return 'production';
	throw new Error(`Unsupported DASHBOARD_MODE: ${value}. Use development or production.`);
}

async function startTunnel(token) {
	const binary = await ensureCloudflaredBinary();
	startProcess('tunnel', binary, ['tunnel', '--protocol', 'http2', '--loglevel', 'error', 'run', '--token', token], {
		fatal: false,
		quietStdout: true,
		onUnexpectedExit: ({ signal }) => recoverTunnel(token, signal)
	});
}

async function recoverTunnel(token, signal) {
	if (signal !== 'SIGSEGV' || tunnelRecoveryAttempted || shuttingDown) {
		console.warn('[startup] Cloudflare tunnel is offline; bot and dashboard processes will remain running.');
		return;
	}

	tunnelRecoveryAttempted = true;
	console.warn('[startup] Cloudflare tunnel crashed with SIGSEGV. Reinstalling cloudflared and retrying once.');
	fs.rmSync(cloudflaredBinary, { force: true });

	try {
		await startTunnel(token);
	} catch (error) {
		console.warn(`[startup] Cloudflare tunnel recovery failed: ${error.message}`);
		console.warn('[startup] Bot and dashboard processes will remain running without the tunnel.');
	}
}

function normalizeDashboardAssets() {
	const nestedStatic = path.join(dashboardStandaloneAppRoot, '.next', 'static');
	const nestedPublic = path.join(dashboardStandaloneAppRoot, 'public');

	copyFirstExistingDirectory(
		[
			path.join(root, 'apps', 'dashboard', '.next', 'static'),
			path.join(dashboardStandaloneRoot, '.next', 'static')
		],
		nestedStatic,
		'dashboard static assets'
	);

	copyFirstExistingDirectory(
		[
			path.join(root, 'apps', 'dashboard', 'public'),
			path.join(dashboardStandaloneRoot, 'public')
		],
		nestedPublic,
		'dashboard public assets'
	);
}

function copyFirstExistingDirectory(sources, destination, label) {
	if (fs.existsSync(destination)) return;

	const source = sources.find((candidate) => fs.existsSync(candidate));
	if (!source) {
		console.warn(`[startup] ${label} not found. Expected one of: ${sources.join(', ')}`);
		return;
	}

	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.cpSync(source, destination, { recursive: true, force: true });
	console.log(`[startup] Copied ${label} from ${source} to ${destination}`);
}

function loadDotEnv(filePath) {
	if (!fs.existsSync(filePath)) {
		console.warn('[startup] .env file not found. Using Wispbyte environment variables only.');
		return;
	}

	const content = fs.readFileSync(filePath, 'utf8');
	let loaded = 0;

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const separator = line.indexOf('=');
		if (separator === -1) continue;

		const key = line.slice(0, separator).trim();
		const value = stripEnvQuotes(line.slice(separator + 1).trim());
		if (!key || process.env[key] !== undefined) continue;

		process.env[key] = value;
		loaded++;
	}

	console.log(`[startup] Loaded ${loaded} environment value(s) from .env.`);
	if (!process.env.DISCORD_CLIENT_ID) console.warn('[startup] DISCORD_CLIENT_ID is still missing after loading .env.');
	if (!process.env.DISCORD_CLIENT_SECRET) console.warn('[startup] DISCORD_CLIENT_SECRET is still missing after loading .env.');
	if (!process.env.NEXTAUTH_URL) console.warn('[startup] NEXTAUTH_URL is still missing after loading .env.');
}

function stripEnvQuotes(value) {
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1);
	}

	return value;
}

async function installAndBuildDashboard() {
	console.warn('[startup] Dashboard build not found. Running one-time dependency install/build.');
	console.warn('[startup] This is required because Wispbyte only runs the configured startup command.');

	await runCommand('install', getNpmCommand(), ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
		NPM_CONFIG_AUDIT: 'false',
		NPM_CONFIG_FUND: 'false',
		NPM_CONFIG_PROGRESS: 'false',
		NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=384'
	});

	await runCommand('dashboard-build', getNpmCommand(), ['--workspace', '@cadia/dashboard', 'run', 'build'], {
		NEXT_TELEMETRY_DISABLED: '1',
		NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=384'
	});

	if (!fs.existsSync(dashboardServer)) {
		throw new Error('Dashboard build finished but standalone server was not created.');
	}
}

function startProcess(name, command, args, options = {}) {
	const child = spawn(command, args, {
		cwd: options.cwd || root,
		env: { ...process.env, ...(options.env || {}) },
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true
	});

	children.set(name, child);
	console.log(`[startup] Started ${name} (${child.pid})`);

	if (!options.quietStdout) child.stdout.on('data', (chunk) => writePrefixedLog(name, chunk));
	child.stderr.on('data', (chunk) => writePrefixedLog(name, chunk));

	child.on('exit', (code, signal) => {
		children.delete(name);
		if (shuttingDown) return;

		console.error(`[startup] ${name} exited unexpectedly with code ${code ?? 'null'} signal ${signal ?? 'null'}`);
		if (options.fatal === false) {
			Promise.resolve(options.onUnexpectedExit?.({ code, signal })).catch((error) => {
				console.warn(`[startup] ${name} recovery failed: ${error.message}`);
			});
			return;
		}
		shutdown(1);
	});

	child.on('error', (error) => {
		console.error(`[startup] Failed to start ${name}: ${error.message}`);
		if (options.fatal === false) {
			children.delete(name);
			Promise.resolve(options.onUnexpectedExit?.({ code: null, signal: null, error })).catch((recoveryError) => {
				console.warn(`[startup] ${name} recovery failed: ${recoveryError.message}`);
			});
			return;
		}
		shutdown(1);
	});
}

function runCommand(name, command, args, envPatch = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: root,
			env: { ...process.env, ...envPatch },
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});

		console.log(`[startup] Running ${name}: ${command} ${args.join(' ')}`);
		child.stdout.on('data', (chunk) => writePrefixedLog(name, chunk));
		child.stderr.on('data', (chunk) => writePrefixedLog(name, chunk));
		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${name} failed with code ${code ?? 'null'} signal ${signal ?? 'null'}`));
		});
	});
}

function getNpmCommand() {
	return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function writePrefixedLog(name, chunk) {
	for (const line of chunk.toString().split(/\r?\n/)) {
		if (line.trim().length === 0) continue;
		console.log(`[${name}] ${line}`);
	}
}

function readCloudflaredToken() {
	if (process.env.CLOUDFLARED_TOKEN?.trim()) return process.env.CLOUDFLARED_TOKEN.trim();

	const tokenFile = path.join(root, '.cloudflared-token');
	if (!fs.existsSync(tokenFile)) return '';

	return fs.readFileSync(tokenFile, 'utf8').trim();
}

async function ensureCloudflaredBinary() {
	if (fs.existsSync(cloudflaredBinary)) return cloudflaredBinary;

	const downloadUrl = getCloudflaredDownloadUrl();
	console.log(`[startup] cloudflared not found. Downloading ${downloadUrl}`);
	fs.mkdirSync(runtimeDir, { recursive: true });

	await downloadFile(downloadUrl, cloudflaredBinary);
	if (process.platform !== 'win32') fs.chmodSync(cloudflaredBinary, 0o755);

	console.log(`[startup] cloudflared installed at ${cloudflaredBinary}`);
	return cloudflaredBinary;
}

function getCloudflaredDownloadUrl() {
	const platform = process.platform;
	const arch = process.arch;

	if (platform === 'linux' && arch === 'x64') {
		return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
	}
	if (platform === 'linux' && arch === 'arm64') {
		return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64';
	}
	if (platform === 'win32' && arch === 'x64') {
		return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
	}

	throw new Error(`Unsupported cloudflared platform: ${platform}/${arch}`);
}

function downloadFile(url, destination, redirects = 0) {
	return new Promise((resolve, reject) => {
		const request = https.get(url, (response) => {
			if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
				response.resume();
				if (redirects >= 5) {
					reject(new Error('Too many redirects while downloading cloudflared.'));
					return;
				}
				const redirectedUrl = new URL(response.headers.location, url).toString();
				resolve(downloadFile(redirectedUrl, destination, redirects + 1));
				return;
			}

			if (response.statusCode !== 200) {
				response.resume();
				reject(new Error(`cloudflared download failed with HTTP ${response.statusCode}`));
				return;
			}

			const file = fs.createWriteStream(destination, { mode: 0o755 });
			response.pipe(file);
			file.on('finish', () => file.close(resolve));
			file.on('error', (error) => {
				fs.rmSync(destination, { force: true });
				reject(error);
			});
		});

		request.on('error', reject);
		request.setTimeout(120_000, () => {
			request.destroy(new Error('cloudflared download timed out.'));
		});
	});
}

function shutdown(exitCode = 0) {
	if (shuttingDown) return;
	shuttingDown = true;

	console.log('[startup] Stopping Cadia processes...');
	for (const [name, child] of children) {
		console.log(`[startup] Stopping ${name} (${child.pid})`);
		child.kill('SIGTERM');
	}

	setTimeout(() => {
		for (const child of children.values()) child.kill('SIGKILL');
		process.exit(exitCode);
	}, 10_000).unref();
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
