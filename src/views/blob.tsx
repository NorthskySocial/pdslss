import { createResource, createSignal, For, Show } from "solid-js";
import { Client, CredentialManager } from "@atcute/client";
import { query, useParams } from "@solidjs/router";
import { resolvePDS } from "../utils/api.js";

const LIMIT = 1000;

const BlobView = () => {
  const params = useParams();
  const [cursor, setCursor] = createSignal<string>();
  const did = params.repo;
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

  const fetchBlobs = async () => {
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
                class="rounded px-0.5 hover:bg-zinc-200 dark:hover:bg-neutral-700"
              >
                <span class="text-sky-500">{cid}</span>
              </a>
            )}
          </For>
        </div>
      </Show>
      <Show when={cursor() && !response.loading}>
        <button
          type="button"
          onclick={() => refetch()}
          class="dark:hover:bg-dark-300 rounded-lg border border-gray-400 bg-transparent px-2 py-1.5 text-sm font-bold hover:bg-zinc-100 focus:border-blue-500 focus:outline-none"
        >
          Load More
        </button>
      </Show>
      <Show when={response.loading}>
        <div class="i-eos-icons-loading mt-2 text-xl" />
      </Show>
    </div>
  );
};

export { BlobView };
