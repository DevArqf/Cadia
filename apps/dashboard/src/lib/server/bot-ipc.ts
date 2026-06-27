const { DEFAULT_IPC_ENDPOINT, createIpcClient } = require("@cadia/ipc");

const ipc = createIpcClient({
  endpoint: process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT,
  timeoutMs: Number(process.env.CADIA_IPC_TIMEOUT_MS || 15000),
});

export async function requestBot<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  return ipc.request(type, payload);
}

export async function readBotStatus() {
  try {
    const data = await requestBot<any>("bot.status");
    return { connected: true, data, error: null };
  } catch (error: any) {
    return { connected: false, data: null, error: error?.message || "Bot IPC unavailable" };
  }
}

