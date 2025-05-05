import { query } from "@solidjs/router";
import { createStore } from "solid-js/store";

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
  CompositeHandleResolver,
  DohJsonHandleResolver,
  PlcDidDocumentResolver,
  WellKnownHandleResolver,
  XrpcHandleResolver,
} from "@atcute/identity-resolver";

import { setPDS } from "../components/navbar";

const didDocumentResolver = new CompositeDidDocumentResolver({
  methods: {
    plc: new PlcDidDocumentResolver(),
    web: new AtprotoWebDidDocumentResolver(),
  },
});

const handleResolver = new XrpcHandleResolver({
  serviceUrl: "https://public.api.bsky.app",
});

const didPDSCache: Record<string, string> = {};
const [labelerCache, setLabelerCache] = createStore<Record<string, string>>({});
const didDocCache: Record<string, DidDocument> = {};
const getPDS = query(async (did: string) => {
  if (did in didPDSCache) return didPDSCache[did];

  if (!isAtprotoDid(did)) {
    throw new Error("Not a valid DID identifier");
  }

  const doc = await didDocumentResolver.resolve(did);
  didDocCache[did] = doc;

  const pds = getPdsEndpoint(doc);
  const labeler = getLabelerEndpoint(doc);

  if (labeler) {
    setLabelerCache(did, labeler);
  }

  if (!pds) {
    throw new Error("No PDS found");
  }

  return (didPDSCache[did] = pds);
}, "getPDS");

const resolveHandle = async (handle: string) => {
  if (!isHandle(handle)) {
    throw new Error("Not a valid handle");
  }

  return await handleResolver.resolve(handle);
};

const validateHandle = async (handle: string, did: string) => {
  if (!isHandle(handle)) return false;

  const handleResolver = new CompositeHandleResolver({
    methods: {
      dns: new DohJsonHandleResolver({ dohUrl: "https://mozilla.cloudflare-dns.com/dns-query" }),
      http: new WellKnownHandleResolver(),
    },
  });

  let resolvedDid: string;
  try {
    resolvedDid = await handleResolver.resolve(handle);
  } catch {
    return false;
  }
  if (resolvedDid !== did) return false;
  return true;
};

const resolvePDS = async (did: string) => {
  setPDS(undefined);
  const pds = await getPDS(did);
  if (!pds) throw new Error("No PDS found");
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
  const url = new URL(localStorage.constellationHost || "https://constellation.microcosm.blue");
  url.pathname = endpoint;
  url.searchParams.set("target", target);
  if (collection) {
    if (!path) throw new Error("collection and path must either both be set or neither");
    url.searchParams.set("collection", collection);
    url.searchParams.set("path", path);
  } else {
    if (path) throw new Error("collection and path must either both be set or neither");
  }
  if (limit) url.searchParams.set("limit", `${limit}`);
  if (cursor) url.searchParams.set("cursor", `${cursor}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed to fetch from constellation");
  return await res.json();
};

const getAllBacklinks = (target: string) => getConstellation("/links/all", target);

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
) => getConstellation("/links/distinct-dids", target, collection, path, cursor, limit || 100);

export {
  didDocCache,
  getAllBacklinks,
  getDidBacklinks,
  getPDS,
  getRecordBacklinks,
  labelerCache,
  resolveHandle,
  validateHandle,
  resolvePDS,
  type LinkData,
};
