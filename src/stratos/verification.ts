import {
  P256PublicKey,
  parsePublicMultikey,
  Secp256k1PublicKey,
  type PublicKey,
} from "@atcute/crypto";
import { getVerificationMaterial, webDidToDocumentUrl, type DidDocument } from "@atcute/identity";
import type { AtprotoDid, Did } from "@atcute/lexicons/syntax";
import { verifyRecord } from "@atcute/repo";

export type VerificationLevel = "service-signature" | "cid-integrity";

export interface StratosVerificationResult {
  level: VerificationLevel;
}

// signing key cache keyed by service DID
const signingKeyCache = new Map<string, PublicKey>();

/**
 * resolves a Stratos service's signing public key from its did:web document.
 * uses the standard #atproto verificationMethod fragment per the AT Protocol DID spec.
 * results are cached — the key doesn't change unless the service rotates it.
 */
export const resolveServiceSigningKey = async (serviceDid: string): Promise<PublicKey> => {
  const cached = signingKeyCache.get(serviceDid);
  if (cached) return cached;

  if (!serviceDid.startsWith("did:web:")) {
    throw new Error(`expected did:web, got: ${serviceDid}`);
  }

  const url = webDidToDocumentUrl(serviceDid as Did<"web">);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch DID document: ${res.status} ${res.statusText}`);
  }

  const doc = (await res.json()) as DidDocument;

  const material = getVerificationMaterial(doc, "#atproto");
  if (!material) {
    throw new Error("DID document has no #atproto verificationMethod");
  }

  const found = parsePublicMultikey(material.publicKeyMultibase);

  let key: PublicKey;
  switch (found.type) {
    case "secp256k1":
      key = await Secp256k1PublicKey.importRaw(found.publicKeyBytes);
      break;
    case "p256":
      key = await P256PublicKey.importRaw(found.publicKeyBytes);
      break;
    default:
      throw new Error(`unsupported key type: ${(found as { type: string }).type}`);
  }

  signingKeyCache.set(serviceDid, key);
  return key;
};

/**
 * verifies a Stratos record with signature verification when possible,
 * falling back to CID integrity if the signing key can't be resolved.
 */
export const verifyStratosRecord = async (
  carBytes: Uint8Array,
  did: string,
  collection: string,
  rkey: string,
  serviceDid: string | undefined,
): Promise<StratosVerificationResult> => {
  let signingKey: PublicKey | undefined;
  if (serviceDid) {
    try {
      signingKey = await resolveServiceSigningKey(serviceDid);
    } catch {
      // key resolution failed — fall through to CID-only
    }
  }

  if (signingKey) {
    await verifyRecord({
      carBytes,
      collection,
      rkey,
      did: did as AtprotoDid,
      publicKey: signingKey,
    });
    return { level: "service-signature" };
  }

  await verifyRecord({
    carBytes,
    collection,
    rkey,
    did: did as AtprotoDid,
  });
  return { level: "cid-integrity" };
};
