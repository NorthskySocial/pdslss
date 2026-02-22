/**
 * Stratos record attestation verification for pdsls.
 *
 * Using @atcute packages to avoid too much divergence
 * Canonical implementation lives in stratos-core/client 
 * Need to switch once it's published
 *
 * @see https://github.com/northskysocial/stratos — stratos-core/src/client/verify.ts
 */
import * as CAR from '@atcute/car';
import * as CBOR from '@atcute/cbor';
import * as CID from '@atcute/cid';

export interface VerifyStratosRecordOptions {
	did: string;
	collection: string;
	rkey: string;
	carBytes: Uint8Array;
}

export interface VerifiedStratosRecord {
	cid: string;
	record: unknown;
}

/**
 * checks if CAR bytes contain a Stratos record attestation as root
 */
export function isStratosAttestation(carBytes: Uint8Array): boolean {
	try {
		const reader = CAR.fromUint8Array(carBytes);
		const roots = reader.roots;
		if (roots.length !== 1) {
			return false;
		}

		const rootCidStr = roots[0].$link;

		for (const entry of reader) {
			if (CID.toString(entry.cid) === rootCidStr) {
				const decoded = CBOR.decode(entry.bytes);
				return decoded?.type === 'stratos-record-attestation';
			}
		}

		return false;
	} catch {
		return false;
	}
}

/**
 * verifies a Stratos record attestation CAR.
 *
 * checks:
 * - CAR has exactly 1 root (the attestation block)
 * - all block CIDs match their content hashes
 * - attestation references the correct did, collection, rkey
 * - record block referenced by attestation exists in CAR
 */
export async function verifyStratosRecord(
	options: VerifyStratosRecordOptions,
): Promise<VerifiedStratosRecord> {
	const { did, collection, rkey, carBytes } = options;

	const reader = CAR.fromUint8Array(carBytes);
	const roots = reader.roots;
	if (roots.length !== 1) {
		throw new Error(`expected 1 CAR root, got ${roots.length}`);
	}

	const rootCidStr = roots[0].$link;

	const blocks = new Map<string, Uint8Array>();
	for (const entry of reader) {
		const computed = await CID.create(entry.cid.codec as 0x55 | 0x71, entry.bytes);
		if (!CID.equals(entry.cid, computed)) {
			throw new Error(`CID integrity check failed for ${CID.toString(entry.cid)}`);
		}
		blocks.set(CID.toString(entry.cid), entry.bytes);
	}

	const rootBytes = blocks.get(rootCidStr);
	if (!rootBytes) {
		throw new Error('root block not found in CAR');
	}

	const attestation = CBOR.decode(rootBytes);
	if (attestation?.type !== 'stratos-record-attestation') {
		throw new Error(`unexpected root type: ${attestation?.type}`);
	}

	if (attestation.did !== did) {
		throw new Error(`attestation DID mismatch: expected ${did}`);
	}
	if (attestation.collection !== collection) {
		throw new Error(`attestation collection mismatch: expected ${collection}`);
	}
	if (attestation.rkey !== rkey) {
		throw new Error(`attestation rkey mismatch: expected ${rkey}`);
	}

	const recordCid = attestation.cid as string;
	const recordBytes = blocks.get(recordCid);
	if (!recordBytes) {
		throw new Error('record block referenced by attestation not found in CAR');
	}

	const record = CBOR.decode(recordBytes);

	return { cid: recordCid, record };
}
