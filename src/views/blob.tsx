import { createSignal, For, onMount, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { query, useParams } from "@solidjs/router";
import { setNotice, setPDS } from "../main.jsx";
import { resolvePDS } from "../utils/api.js";
import { resolveHandle } from "@atcute/oauth-browser-client";

const BlobView: Component = () => {
  const params = useParams();
  const [cursor, setCursor] = createSignal<string>();
  const [blobs, setBlobs] = createSignal<string[]>();
  let rpc: XRPC;
  let did: string;
  let pds: string;

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    pds =
      params.pds.startsWith("localhost") ?
        `http://${params.pds}`
      : `https://${params.pds}`;
    did =
      params.repo.startsWith("did:") ?
        params.repo
      : await resolveHandle(params.repo);
    if (params.pds === "at") pds = await resolvePDS(did);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    await fetchBlobs();
    setNotice("");
  });

  const fetchBlobs = async () => {
    const res = await listBlobs(did, cursor());
    setCursor(res.data.cids.length < 100 ? undefined : res.data.cursor);
    setBlobs(blobs()?.concat(res.data.cids) ?? res.data.cids);
  };

  const listBlobs = query(
    (did: string, cursor: string | undefined) =>
      rpc.get("com.atproto.sync.listBlobs", {
        params: {
          did: did as any,
          limit: 1000,
          cursor: cursor,
        },
      }),
    "listBlobs",
  );

  return (
    <div class="flex flex-col items-center">
      <Show when={blobs()}>
        <div class="break-anywhere flex flex-col font-mono">
          <For each={blobs()}>
            {(cid) => (
              <a
                href={`${pds}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`}
                target="_blank"
                class="hover:bg-neutral-300 dark:hover:bg-neutral-700"
              >
                <span class="text-lightblue-500">{cid}</span>
              </a>
            )}
          </For>
        </div>
      </Show>
      <Show when={cursor()}>
        <button
          type="button"
          onclick={() => fetchBlobs()}
          class="dark:bg-dark-700 dark:hover:bg-dark-800 mt-1 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Load More
        </button>
      </Show>
    </div>
  );
};

export { BlobView };
