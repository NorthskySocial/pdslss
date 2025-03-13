import { XRPC } from "@atcute/client";
import { At } from "@atcute/client/lexicons";

import * as CAR from "@atcute/car";
import * as CBOR from "@atcute/cbor";
import * as CID from "@atcute/cid";
import {
  type FoundPublicKey,
  getPublicKeyFromDidController,
  verifySig,
} from "@atcute/crypto";
import {
  type DidDocument,
  getAtprotoVerificationMaterial,
} from "@atcute/identity";

import { type AddressedAtUri, parseAddressedAtUri } from "./types/at-uri";

export interface VerifyError {
  message: string;
  detail?: unknown;
}

export interface VerifyResult {
  errors: VerifyError[];
}

export interface VerifyOptions {
  rpc: XRPC;
  uri: string;
  cid: string;
  record: unknown;
  didDoc: DidDocument;
}

export const verifyRecord = async (
  opts: VerifyOptions,
): Promise<VerifyResult> => {
  const errors: VerifyError[] = [];

  // verify cid can be parsed
  try {
    CID.fromString(opts.cid);
  } catch (e) {
    errors.push({ message: `provided cid is invalid`, detail: e });
  }

  // verify record content matches cid
  let cbor: Uint8Array;
  {
    cbor = CBOR.encode(opts.record);

    const cid = await CID.create(CID.CODEC_DCBOR, cbor);
    const cidString = CID.toString(cid);

    if (cidString !== opts.cid) {
      errors.push({ message: `record content does not match cid` });
    }
  }

  // verify at-uri is valid
  let uri: AddressedAtUri;
  try {
    uri = parseAddressedAtUri(opts.uri);

    if (uri.repo !== opts.didDoc.id) {
      errors.push({ message: `repo in at-uri does not match did document` });
    }
  } catch {
    errors.push({ message: `provided at-uri is invalid` });
    return { errors };
  }

  // grab public key from did document
  let publicKey: FoundPublicKey;
  try {
    const controller = getAtprotoVerificationMaterial(opts.didDoc);
    if (!controller) {
      errors.push({
        message: `did document does not contain verification material`,
      });
      return { errors };
    }

    publicKey = getPublicKeyFromDidController(controller);
  } catch (err) {
    errors.push({
      message: `failed to get public key from did document`,
      detail: err,
    });
    return { errors };
  }

  // grab the raw record blocks from the pds
  let car: Uint8Array;
  try {
    const { data } = await opts.rpc.get("com.atproto.sync.getRecord", {
      params: {
        did: opts.didDoc.id as At.DID,
        collection: uri.collection,
        rkey: uri.rkey,
      },
    });

    car = data;
  } catch (e) {
    errors.push({ message: `failed to fetch car from pds`, detail: e });
    return { errors };
  }

  // read the car
  let blockmap: Map<string, Uint8Array>;
  let commit: CAR.Commit;

  try {
    const { roots, iterate } = CAR.readCar(car);
    if (roots.length !== 1) {
      errors.push({ message: `car must have exactly one root` });
      return { errors };
    }

    blockmap = CAR.collectBlock(iterate());
    if (blockmap.size === 0) {
      errors.push({ message: `car must have at least one block` });
      return { errors };
    }

    commit = CAR.readBlock(blockmap, roots[0], CAR.isCommit);
  } catch (err) {
    errors.push({ message: `failed to read car`, detail: err });
    return { errors };
  }

  // verify did in commit matches the did in the at-uri
  if (commit.did !== opts.didDoc.id) {
    errors.push({ message: `did in commit does not match did document` });
  }

  // verify signature contained in commit is valid
  {
    const { sig, ...unsigned } = commit;

    const data = CBOR.encode(unsigned);
    const valid = await verifySig(publicKey, CBOR.fromBytes(sig), data);

    if (!valid) {
      errors.push({ message: `signature verification failed` });
    }
  }

  // walk through the car to find the record
  let found: CID.CidLink | undefined;
  for (const { key, cid } of CAR.walkMstEntries(blockmap, commit.data)) {
    const [collection, rkey] = key.split("/");

    if (collection !== uri.collection) {
      continue;
    }
    if (rkey !== uri.rkey) {
      continue;
    }

    found = cid;
    break;
  }

  if (!found) {
    errors.push({ message: `could not find record in car` });
    return { errors };
  }

  // verify record in car matches provided record
  {
    const actual = blockmap.get(found.$link);
    if (!actual) {
      errors.push({ message: `could not find record in car` });
      return { errors };
    }

    const matches =
      cbor.length === actual.length && cbor.every((v, i) => v === actual[i]);

    if (!matches) {
      errors.push({ message: `record in car does not match provided record` });
      return { errors };
    }
  }

  return { errors };
};
