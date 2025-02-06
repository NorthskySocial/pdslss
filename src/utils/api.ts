import { CredentialManager, XRPC } from "@atcute/client";
import { query } from "@solidjs/router";
import { setPDS } from "../components/navbar";
import { DidDocument } from "@atcute/client/utils/did";
import { createStore } from "solid-js/store";

const didPDSCache: Record<string, string> = {};
const [labelerCache, setLabelerCache] = createStore<Record<string, string>>({});
const didDocCache: Record<string, DidDocument> = {};
const getPDS = query(async (did: string) => {
  if (did in didPDSCache) return didPDSCache[did];
  const res = await fetch(
    did.startsWith("did:web") ?
      `https://${did.split(":")[2]}/.well-known/did.json`
    : "https://plc.directory/" + did,
  );

  return res.json().then((doc: DidDocument) => {
    if (!doc.service) throw new Error("No PDS found");
    for (const service of doc.service) {
      if (service.id === "#atproto_pds") {
        didPDSCache[did] = service.serviceEndpoint.toString();
        didDocCache[did] = doc;
      }
      if (service.id === "#atproto_labeler")
        setLabelerCache(did, service.serviceEndpoint.toString());
    }
    return didPDSCache[did];
  });
}, "getPDS");

const resolveHandle = async (handle: string) => {
  const rpc = new XRPC({
    handler: new CredentialManager({ service: "https://public.api.bsky.app" }),
  });
  const res = await rpc.get("com.atproto.identity.resolveHandle", {
    params: { handle: handle },
  });
  return res.data.did;
};

const resolvePDS = async (did: string) => {
  setPDS(undefined);
  const pds = await getPDS(did);
  if (!pds) throw new Error("No PDS found");
  setPDS(pds.replace("https://", "").replace("http://", ""));
  return pds;
};

export { getPDS, labelerCache, didDocCache, resolveHandle, resolvePDS };
