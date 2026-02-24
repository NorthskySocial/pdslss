import { type IndexedEntryLog, processIndexedEntryLog } from "@atcute/did-plc";

self.onmessage = async (e: MessageEvent<{ did: string; logs: IndexedEntryLog }>) => {
  const { did, logs } = e.data;
  try {
    await processIndexedEntryLog(did as `did:plc:${string}`, logs);
    self.postMessage({ valid: true });
  } catch {
    self.postMessage({ valid: false });
  }
};
