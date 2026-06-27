type IpcClient = { request: (type: string, payload: Record<string, unknown>) => Promise<unknown> };

let ipc: IpcClient | null = null;

try {
  // Indirect eval returns the real runtime `require`, defeating static
  // bundler analysis so `@cadia/ipc` is never resolved at build time.
  const runtimeRequire = (0, eval)("require") as NodeRequire;
  const { DEFAULT_IPC_ENDPOINT, createIpcClient } = runtimeRequire("@cadia/ipc");
  ipc = createIpcClient({
    endpoint: process.env.CADIA_IPC_ENDPOINT || DEFAULT_IPC_ENDPOINT,
    timeoutMs: Number(process.env.CADIA_IPC_TIMEOUT_MS || 5000),
  }) as IpcClient;
} catch {
  ipc = null;
}

export async function requestBot<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!ipc) {
    throw new Error("Bot IPC unavailable (@cadia/ipc not installed or bot offline)");
  }
  return ipc.request(type, payload) as Promise<T>;
}

export async function readBotStatus() {
  try {
    const data = await requestBot<any>("bot.status");
    return { connected: true, data, error: null };
  } catch (error: any) {
    return { connected: false, data: null, error: error?.message || "Bot IPC unavailable" };
  }
}
