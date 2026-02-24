import { parseDidKey, parsePublicMultikey } from "@atcute/crypto";
import { fromBase58Btc } from "@atcute/multibase";

export const detectKeyType = (key: string): string => {
  try {
    return parsePublicMultikey(key).type;
  } catch {
    try {
      const bytes = fromBase58Btc(key.startsWith("z") ? key.slice(1) : key);
      if (bytes.length >= 2) {
        const type = (bytes[0] << 8) | bytes[1];
        if (type === 0xed01) {
          return "ed25519";
        }
      }
    } catch { /* multibase decoding may fail */ }
    return "unknown";
  }
};

export const detectDidKeyType = (key: string): string => {
  try {
    return parseDidKey(key).type;
  } catch {
    if (key.startsWith("did:key:")) {
      return detectKeyType(key.slice(8));
    }
    return "unknown";
  }
};
