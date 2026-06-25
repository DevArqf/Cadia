const http = require('node:http');

const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000);

const server = http.createServer((request, response) => {
	if (request.url === '/health') {
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(
			JSON.stringify({
				ok: true,
				service: 'cadia-dashboard',
				version: process.env.npm_package_version || '0.1.0'
			})
		);
		return;
	}

	response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
	response.end('Cadia dashboard workspace is ready. Build the dashboard UI in apps/dashboard.\n');
});

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
