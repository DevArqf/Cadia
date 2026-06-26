const zmq = require('jszmq');

const DEFAULT_IPC_ENDPOINT = 'ws://127.0.0.1:38650/cadia-ipc';
const DEFAULT_TIMEOUT_MS = 2_000;

function createIpcServer({ endpoint = DEFAULT_IPC_ENDPOINT, handler, logger } = {}) {
	if (typeof handler !== 'function') throw new TypeError('createIpcServer requires a handler function.');

	const socket = new zmq.Rep();
	let closed = false;

	socket.on('message', async (frame) => {
		const request = decodeFrame(frame);
		try {
			const result = await handler(request);
			socket.send(encodeFrame({ ok: true, data: result ?? null }));
		} catch (error) {
			logger?.warn?.(`IPC request failed: ${error.message}`);
			socket.send(
				encodeFrame({
					ok: false,
					error: {
						message: error.message || 'IPC request failed',
						code: error.code || 'IPC_HANDLER_ERROR'
					}
				})
			);
		}
	});

	socket.bind(endpoint);

	return {
		endpoint,
		close() {
			if (closed) return;
			closed = true;
			socket.close();
		}
	};
}

function createIpcClient({ endpoint = DEFAULT_IPC_ENDPOINT, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
	return {
		endpoint,
		request(type, payload = {}) {
			return requestIpc({ endpoint, timeoutMs, type, payload });
		}
	};
}

function requestIpc({ endpoint = DEFAULT_IPC_ENDPOINT, timeoutMs = DEFAULT_TIMEOUT_MS, type, payload = {} } = {}) {
	if (!type) return Promise.reject(new TypeError('IPC request requires a type.'));

	return new Promise((resolve, reject) => {
		const socket = new zmq.Req();
		let settled = false;
		const timeout = setTimeout(() => {
			settle(reject, Object.assign(new Error(`IPC request timed out after ${timeoutMs}ms`), { code: 'IPC_TIMEOUT' }));
		}, timeoutMs);

		function settle(done, value) {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			socket.close();
			done(value);
		}

		socket.once('message', (frame) => {
			try {
				const response = decodeFrame(frame);
				if (!response.ok) {
					const error = new Error(response.error?.message || 'IPC request failed');
					error.code = response.error?.code || 'IPC_ERROR';
					settle(reject, error);
					return;
				}
				settle(resolve, response.data);
			} catch (error) {
				settle(reject, error);
			}
		});

		try {
			socket.connect(endpoint);
			socket.send(encodeFrame({ type, payload, sentAt: Date.now() }));
		} catch (error) {
			settle(reject, error);
		}
	});
}

function encodeFrame(value) {
	return JSON.stringify(value);
}

function decodeFrame(frame) {
	return JSON.parse(Buffer.from(frame).toString('utf8'));
}

module.exports = {
	DEFAULT_IPC_ENDPOINT,
	createIpcClient,
	createIpcServer,
	requestIpc
};
