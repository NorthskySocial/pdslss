import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { ComAtprotoRepoListRecords } from "@atcute/client/lexicons";
import { A, query, useParams } from "@solidjs/router";
import { setNotice, setPDS } from "../main.jsx";
import { resolvePDS } from "../utils/api.js";

const CollectionView: Component = () => {
  const params = useParams();
  const [cursorRecord, setCursorRecord] = createSignal<string>();
  const [records, setRecords] =
    createSignal<ComAtprotoRepoListRecords.Record[]>();
  let rpc: XRPC;

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    let pds =
      params.pds.startsWith("localhost") ?
        `http://${params.pds}`
      : `https://${params.pds}`;
    if (params.pds === "at") pds = await resolvePDS(params.repo);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    await fetchRecords();
    setNotice("");
  });

  const fetchRecords = async () => {
    const res = await listRecords(params.collection, cursorRecord());
    setCursorRecord(
      res.data.records.length < 100 ? undefined : res.data.cursor,
    );
    setRecords(records()?.concat(res.data.records) ?? res.data.records);
    setNotice("");
  };

  const listRecords = query(
    (collection: string, cursor: string | undefined) =>
      rpc.get("com.atproto.repo.listRecords", {
        params: {
          repo: params.repo,
          collection: collection,
          limit: 100,
          cursor: cursor,
        },
      }),
    "listRecords",
  );

  return (
    <div class="flex flex-col">
      <For each={records()}>
        {(record) => (
          <A
            href={`${record.uri.split("/").pop()}`}
            class="text-lightblue-500 hover:underline"
          >
            {record.uri.split("/").pop()!}
          </A>
        )}
      </For>
      <Show when={cursorRecord()}>
        <button
          type="button"
          onclick={() => fetchRecords()}
          class="dark:bg-dark-700 dark:hover:bg-dark-800 mt-1 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Load More
        </button>
      </Show>
    </div>
  );
};

export { CollectionView };
