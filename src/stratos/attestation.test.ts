import { encode as cborEncode, toBytes } from "@atcute/cbor";
import { Secp256k1PrivateKeyExportable } from "@atcute/crypto";
import { describe, expect, it } from "vitest";

import { verifyEnrollmentAttestation } from "./attestation";

const TEST_DID = "did:plc:testattestation";
const USER_SIGNING_KEY = "did:key:zDnaeUserTestKey";

const createTestAttestation = async (boundaries: string[]) => {
  const keypair = await Secp256k1PrivateKeyExportable.createKeypair();
  const sorted = [...boundaries].sort();
  const payload = cborEncode({
    boundaries: sorted,
    did: TEST_DID,
    signingKey: USER_SIGNING_KEY,
  });
  const sig = await keypair.sign(payload);
  return { keypair, sig };
};

describe("verifyEnrollmentAttestation", () => {
  it("verifies a valid attestation", async () => {
    const boundaries = ["engineering", "product"];
    const { keypair, sig } = await createTestAttestation(boundaries);
    const serviceDidKey = await keypair.exportPublicKey("did");

    const record = {
      service: "https://stratos.example.com",
      signingKey: USER_SIGNING_KEY,
      boundaries: boundaries.map((b) => ({ value: b })),
      attestation: {
        sig: toBytes(sig),
        signingKey: serviceDidKey,
      },
      createdAt: new Date().toISOString(),
    };

    const result = await verifyEnrollmentAttestation(record, TEST_DID);
    expect(result.valid).toBe(true);
    expect(result.serviceKey).toBe(serviceDidKey);
    expect(result.userSigningKey).toBe(USER_SIGNING_KEY);
    expect(result.boundaries).toEqual(["engineering", "product"]);
  });

  it("verifies regardless of boundary input order", async () => {
    const { keypair, sig } = await createTestAttestation(["zebra", "alpha"]);
    const serviceDidKey = await keypair.exportPublicKey("did");

    const record = {
      service: "https://stratos.example.com",
      signingKey: USER_SIGNING_KEY,
      boundaries: [{ value: "zebra" }, { value: "alpha" }],
      attestation: {
        sig: toBytes(sig),
        signingKey: serviceDidKey,
      },
      createdAt: new Date().toISOString(),
    };

    const result = await verifyEnrollmentAttestation(record, TEST_DID);
    expect(result.valid).toBe(true);
  });

  it("rejects tampered boundaries", async () => {
    const { keypair, sig } = await createTestAttestation(["engineering"]);
    const serviceDidKey = await keypair.exportPublicKey("did");

    const record = {
      service: "https://stratos.example.com",
      signingKey: USER_SIGNING_KEY,
      boundaries: [{ value: "engineering" }, { value: "admin" }],
      attestation: {
        sig: toBytes(sig),
        signingKey: serviceDidKey,
      },
      createdAt: new Date().toISOString(),
    };

    const result = await verifyEnrollmentAttestation(record, TEST_DID);
    expect(result.valid).toBe(false);
  });

  it("rejects wrong DID", async () => {
    const { keypair, sig } = await createTestAttestation(["engineering"]);
    const serviceDidKey = await keypair.exportPublicKey("did");

    const record = {
      service: "https://stratos.example.com",
      signingKey: USER_SIGNING_KEY,
      boundaries: [{ value: "engineering" }],
      attestation: {
        sig: toBytes(sig),
        signingKey: serviceDidKey,
      },
      createdAt: new Date().toISOString(),
    };

    const result = await verifyEnrollmentAttestation(record, "did:plc:impersonator");
    expect(result.valid).toBe(false);
  });

  it("rejects wrong service key", async () => {
    const { sig } = await createTestAttestation(["engineering"]);
    const wrongKeypair = await Secp256k1PrivateKeyExportable.createKeypair();
    const wrongDidKey = await wrongKeypair.exportPublicKey("did");

    const record = {
      service: "https://stratos.example.com",
      signingKey: USER_SIGNING_KEY,
      boundaries: [{ value: "engineering" }],
      attestation: {
        sig: toBytes(sig),
        signingKey: wrongDidKey,
      },
      createdAt: new Date().toISOString(),
    };

    const result = await verifyEnrollmentAttestation(record, TEST_DID);
    expect(result.valid).toBe(false);
  });

  it("returns error for missing attestation", async () => {
    const record = {
      service: "https://stratos.example.com",
      createdAt: new Date().toISOString(),
    };

    const result = await verifyEnrollmentAttestation(record, TEST_DID);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("missing");
  });
});
