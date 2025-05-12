import { createResource, createSignal, For, Show } from "solid-js";
import { Client, CredentialManager } from "@atcute/client";
import { query, useParams } from "@solidjs/router";
import { resolveHandle, resolvePDS } from "../utils/api.js";

const LIMIT = 1000;

const BlobView = () => {
  const params = useParams();
  const [cursor, setCursor] = createSignal<string>();
  let did = params.repo;
  let pds: string;
  let rpc: Client;

  const listBlobs = query(
    (did: string, cursor: string | undefined) =>
      rpc.get("com.atproto.sync.listBlobs", {
        params: {
          did: did as `did:${string}:${string}`,
          limit: LIMIT,
          cursor: cursor,
        },
      }),
    "listBlobs",
  );

  const fetchBlobs = async (): Promise<string[]> => {
    if (!did.startsWith("did:")) did = await resolveHandle(params.repo);
    if (!pds) pds = await resolvePDS(did);
    if (!rpc) rpc = new Client({ handler: new CredentialManager({ service: pds }) });
    const res = await listBlobs(did, cursor());
    if (!res.ok) throw new Error(res.data.error);
    if (!res.data.cids) return [];
    setCursor(res.data.cids.length < LIMIT ? undefined : res.data.cursor);
    setBlobs(blobs()?.concat(res.data.cids) ?? res.data.cids);
    return res.data.cids;
  };

  const [response, { refetch }] = createResource(fetchBlobs);
  const [blobs, setBlobs] = createSignal<string[]>();

  return (
    <div class="mt-3 flex flex-col items-center gap-2">
      <Show when={blobs() || response()}>
        <p>
          {blobs()?.length} blob{(blobs()?.length ?? 0 > 1) ? "s" : ""}
        </p>
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
      <Show when={cursor() && !response.loading}>
        <button
          type="button"
          onclick={() => refetch()}
          class="dark:bg-dark-700 dark:hover:bg-dark-800 mt-1 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          Load More
        </button>
      </Show>
      <Show when={response.loading}>
        <div class="i-line-md-loading-twotone-loop mt-2 text-xl"></div>
      </Show>
    </div>
  );
};

export { BlobView };
