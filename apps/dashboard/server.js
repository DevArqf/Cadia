const http = require('node:http');
const { DEFAULT_IPC_ENDPOINT, createIpcClient } = require('@cadia/ipc');

const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000);
const ipcEndpoint = process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT;
const ipc = createIpcClient({
	endpoint: ipcEndpoint,
	timeoutMs: Number(process.env.CADIA_IPC_TIMEOUT_MS) || 1_500
});

const server = http.createServer(async (request, response) => {
	if (request.url === '/health') {
		const bot = await readBotStatus();
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(
			JSON.stringify({
				ok: true,
				service: 'cadia-dashboard',
				version: process.env.npm_package_version || '0.1.0',
				ipc: {
					endpoint: ipcEndpoint,
					connected: bot.connected,
					error: bot.error
				},
				bot: bot.data
			})
		);
		return;
	}

	if (request.url === '/api/bot/status') {
		const bot = await readBotStatus();
		response.writeHead(bot.connected ? 200 : 503, { 'content-type': 'application/json' });
		response.end(JSON.stringify(bot));
		return;
	}

	response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
	response.end('Cadia dashboard workspace is ready. IPC status is available at /api/bot/status.\n');
});

async function readBotStatus() {
	try {
		return {
			connected: true,
			data: await ipc.request('bot.status')
		};
	} catch (error) {
		return {
			connected: false,
			data: null,
			error: error.message
		};
	}
}

server.listen(port, () => {
	console.log(`Cadia dashboard listening on port ${port}`);
	if (typeof process.send === 'function') process.send('ready');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, () => {
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(0), 5_000).unref();
	});
}
