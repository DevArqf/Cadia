const { DEFAULT_IPC_ENDPOINT, createIpcClient } = require("@cadia/ipc") as {
	DEFAULT_IPC_ENDPOINT: string;
	createIpcClient: (options: { endpoint: string; timeoutMs: number }) => IpcClient;
};

type IpcClient = { request: (type: string, payload: Record<string, unknown>) => Promise<unknown> };

const ipc = createIpcClient({
	endpoint: process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT,
	timeoutMs: Number(process.env.CADIA_IPC_TIMEOUT_MS || 15000)
});

export async function requestBot<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
	if (!ipc) {
		throw new Error('Bot IPC unavailable (@cadia/ipc not installed or bot offline)');
	}
	return ipc.request(type, payload) as Promise<T>;
}

export async function readBotStatus() {
	try {
		const data = await requestBot<any>('bot.status');
		return { connected: true, data, error: null };
	} catch (error: any) {
		return { connected: false, data: null, error: error?.message || 'Bot IPC unavailable' };
	}
}
