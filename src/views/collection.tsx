import { createSignal, onMount, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { ComAtprotoRepoListRecords } from "@atcute/client/lexicons";
import { A, query, useParams } from "@solidjs/router";
import { setNotice, setPDS } from "../main.jsx";
import { resolvePDS } from "../utils/api.js";
import * as TID from "@atcute/tid";

const CollectionView: Component = () => {
  const params = useParams();
  const [cursorRecord, setCursorRecord] = createSignal<string>();
  const [records, setRecords] =
    createSignal<ComAtprotoRepoListRecords.Record[]>();
  const [filter, setFilter] = createSignal<string>();
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

  const getDateFromTID = (rkey: string) =>
    new Date(
      TID.parse(rkey).timestamp / 1000 -
        new Date().getTimezoneOffset() * 60 * 1000,
    )
      .toISOString()
      .split(".")[0]
      .replace("T", " ");

  return (
    <div class="flex flex-col items-center">
      <Show when={records()}>
        <div class="mb-3 flex w-full justify-center gap-x-2 font-sans">
          <input
            type="text"
            spellcheck={false}
            placeholder="Filter by substring"
            class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
            onInput={(e) => setFilter(e.currentTarget.value)}
          />
        </div>
        <div class="flex flex-col">
          {records()!
            .filter((rec) =>
              filter() ? JSON.stringify(rec.value).includes(filter()!) : true,
            )
            .map((record) => {
              const rkey = record.uri.split("/").pop()!;
              return (
                <A
                  href={`${rkey}`}
                  class="hover:bg-neutral-300 dark:hover:bg-neutral-700"
                >
                  <span class="text-lightblue-500">{rkey}</span>
                  <Show when={TID.validate(rkey)}>
                    <span class="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {getDateFromTID(rkey)}
                    </span>
                  </Show>
                </A>
              );
            })}
        </div>
      </Show>
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
