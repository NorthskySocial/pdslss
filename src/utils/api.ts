import { query } from "@solidjs/router";

import {
  type DidDocument,
  getLabelerEndpoint,
  getPdsEndpoint,
  isAtprotoDid,
  isHandle,
} from "@atcute/identity";
import {
  AtprotoWebDidDocumentResolver,
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  XrpcHandleResolver,
} from "@atcute/identity-resolver";

import { setPDS } from "../components/navbar";

export const didDocumentResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new AtprotoWebDidDocumentResolver(),
  },
});

export const handleResolver = new XrpcHandleResolver({
  serviceUrl: "https://public.api.bsky.app",
});

const didDocCache: Record<string, DidDocument> = {};

const resolveHandle = query(async (handle: string) => {
  if (!isHandle(handle)) {
    throw new Error(`Invalid handle`);
  }

  const did = await handleResolver.resolve(handle);

  return did;
}, "resolveHandle");

const resolveDidDocument = query(async (did: string) => {
  if (!isAtprotoDid(did)) {
    throw new Error(`Invalid DID identifier`);
  }

  const didDoc = await didDocumentResolver.resolve(did);

  return didDoc;
}, "resolveDidDocument");

const getPDS = query(async (did: string) => {
  const doc = await resolveDidDocument(did);

  const endpoint = getPdsEndpoint(doc);
  if (!endpoint) {
    throw new Error(`No PDS found`);
  }

  return endpoint;
}, "getPDS");

const getLabeler = query(async (did: string) => {
  const doc = await resolveDidDocument(did);

  const endpoint = getLabelerEndpoint(doc);
  if (!endpoint) {
    throw new Error(`No labeler found`);
  }

  return endpoint;
}, "getLabeler");

const resolvePDS = async (did: string) => {
  setPDS(undefined);
  const pds = await getPDS(did);
  setPDS(pds.replace("https://", "").replace("http://", ""));
  return pds;
};

interface LinkData {
  links: {
    [key: string]: {
      [key: string]: {
        records: number;
        distinct_dids: number;
      };
    };
  };
}

const getConstellation = async (
  endpoint: string,
  target: string,
  collection?: string,
  path?: string,
  cursor?: string,
  limit?: number,
) => {
  const url = new URL(
    localStorage.constellationHost || "https://constellation.microcosm.blue",
  );
  url.pathname = endpoint;
  url.searchParams.set("target", target);
  if (collection) {
    if (!path)
      throw new Error("collection and path must either both be set or neither");
    url.searchParams.set("collection", collection);
    url.searchParams.set("path", path);
  } else {
    if (path)
      throw new Error("collection and path must either both be set or neither");
  }
  if (limit) url.searchParams.set("limit", `${limit}`);
  if (cursor) url.searchParams.set("cursor", `${cursor}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed to fetch from constellation");
  return await res.json();
};

const getAllBacklinks = (target: string) =>
  getConstellation("/links/all", target);

const getRecordBacklinks = (
  target: string,
  collection: string,
  path: string,
  cursor?: string,
  limit?: number,
) => getConstellation("/links", target, collection, path, cursor, limit || 100);

const getDidBacklinks = (
  target: string,
  collection: string,
  path: string,
  cursor?: string,
  limit?: number,
) =>
  getConstellation(
    "/links/distinct-dids",
    target,
    collection,
    path,
    cursor,
    limit || 100,
  );

export {
  didDocCache,
  getAllBacklinks,
  getDidBacklinks,
  getLabeler,
  getPDS,
  getRecordBacklinks,
  resolveDidDocument,
  resolveHandle,
  resolvePDS,
  type LinkData,
};
