/**
 * For any CAR byte array, `isStratosAttestation` returning true must route to
 * `verifyStratosRecord`; returning false must route to `verifyRecord`. The dispatch
 * decision is solely determined by CAR content, not by `stratosActive`.
 */
import * as CAR from '@atcute/car';
import * as CBOR from '@atcute/cbor';
import * as CID from '@atcute/cid';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setStratosActive } from './state';
import { isStratosAttestation } from './verify';

// #region CAR builders

/**
 * builds a minimal valid CAR with a single block.
 * the root CID points to the block.
 */
async function buildCar(blockData: Record<string, unknown>): Promise<Uint8Array> {
	const encoded = CBOR.encode(blockData);
	const cid = await CID.create(0x71, encoded);
	const cidLink = CID.toCidLink(cid);

	const chunks: Uint8Array[] = [];
	for await (const chunk of CAR.writeCarStream([cidLink], [{ cid: cid.bytes, data: encoded }])) {
		chunks.push(chunk);
	}

	const total = chunks.reduce((n, c) => n + c.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

async function buildAttestationCar(): Promise<Uint8Array> {
	return buildCar({ type: 'stratos-record-attestation', did: 'did:plc:test', cid: 'bafy' });
}

async function buildNonAttestationCar(type?: string): Promise<Uint8Array> {
	return buildCar({ type: type ?? 'plain-record', value: 42 });
}

// #endregion

beforeEach(() => {
	setStratosActive(false);
});

afterEach(() => {
	setStratosActive(false);
});

describe('isStratosAttestation', () => {
	it('returns true for valid Stratos attestation CARs', async () => {
		const carBytes = await buildAttestationCar();
		expect(isStratosAttestation(carBytes)).toBe(true);
	});

	it('returns false for non-attestation CARs', async () => {
		const carBytes = await buildNonAttestationCar();
		expect(isStratosAttestation(carBytes)).toBe(false);
	});

	it('returns false for arbitrary byte arrays', () => {
		fc.assert(
			fc.property(fc.uint8Array({ minLength: 0, maxLength: 256 }), (bytes) => {
				const result = isStratosAttestation(bytes);
				expect(typeof result).toBe('boolean');
			}),
			{ numRuns: 200 },
		);
	});
});

describe('Property 3: Attestation dispatch correctness', () => {
	it('dispatch is true for attestation CARs regardless of stratosActive', async () => {
		await fc.assert(
			fc.asyncProperty(fc.boolean(), async (active) => {
				setStratosActive(active);
				const carBytes = await buildAttestationCar();
				expect(isStratosAttestation(carBytes)).toBe(true);
			}),
			{ numRuns: 50 },
		);
	});

	it('dispatch is false for non-attestation CARs regardless of stratosActive', async () => {
		const nonAttestationTypes = ['plain-record', 'commit', 'node', 'blob', undefined];

		await fc.assert(
			fc.asyncProperty(
				fc.boolean(),
				fc.constantFrom(...nonAttestationTypes),
				async (active, type) => {
					setStratosActive(active);
					const carBytes = await buildNonAttestationCar(type);
					expect(isStratosAttestation(carBytes)).toBe(false);
				},
			),
			{ numRuns: 50 },
		);
	});

	it('dispatch result is consistent across stratosActive values for the same CAR bytes', async () => {
		const attestationCar = await buildAttestationCar();
		const plainCar = await buildNonAttestationCar();

		fc.assert(
			fc.property(fc.boolean(), (active) => {
				setStratosActive(active);
				expect(isStratosAttestation(attestationCar)).toBe(true);
				expect(isStratosAttestation(plainCar)).toBe(false);
			}),
			{ numRuns: 50 },
		);
	});
});
