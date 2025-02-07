import { createResource, createSignal, For, onMount, Show } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { useParams, useSearchParams } from "@solidjs/router";
import { labelerCache, resolvePDS } from "../utils/api.js";
import { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { localDateFromTimestamp } from "../utils/date.js";

const LabelView = () => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursor, setCursor] = createSignal<string>();
  const [labels, setLabels] = createSignal<ComAtprotoLabelDefs.Label[]>([]);
  const did = params.repo;
  let rpc: XRPC;

  onMount(async () => {
    await resolvePDS(did);
    rpc = new XRPC({
      handler: new CredentialManager({ service: labelerCache[did] }),
    });
    if (searchParams.uriPatterns) refetch();
  });

  const fetchLabels = async () => {
    const uriPatterns = searchParams.uriPatterns;
    if (!uriPatterns) return;
    const res = await rpc.get("com.atproto.label.queryLabels", {
      params: {
        uriPatterns: uriPatterns.toString().trim().split(","),
        sources: [did as `did:${string}`],
        cursor: cursor(),
      },
    });
    setCursor(res.data.labels.length < 50 ? undefined : res.data.cursor);
    setLabels(labels().concat(res.data.labels) ?? res.data.labels);
    return res.data.labels;
  };

  const [response, { refetch }] = createResource(fetchLabels);

  const queryLabels = async () => {
    setLabels([]);
    setSearchParams({
      uriPatterns: (document.getElementById("patterns") as HTMLInputElement)
        .value,
    });
    refetch();
  };

  return (
    <>
      <div class="z-5 dark:bg-dark-700 sticky top-0 flex w-full flex-col items-center justify-center gap-2 bg-slate-100 py-4">
        <form
          class="flex flex-col items-center gap-y-1"
          onsubmit={(e) => e.preventDefault()}
        >
          <div class="w-full">
            <label for="patterns" class="ml-0.5 text-sm">
              URI Patterns (comma-separated)
            </label>
          </div>
          <div class="flex items-center gap-x-2">
            <textarea
              id="patterns"
              name="patterns"
              spellcheck={false}
              rows={3}
              cols={25}
              value={searchParams.uriPatterns ?? ""}
              class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <div class="flex min-w-[3rem] justify-center">
              <Show when={!response.loading}>
                <button
                  onclick={() => queryLabels()}
                  type="submit"
                  class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  Get
                </button>
              </Show>
              <Show when={response.loading}>
                <div class="i-line-md-loading-twotone-loop text-xl"></div>
              </Show>
            </div>
          </div>
        </form>
        <div class="flex items-center gap-x-2">
          <Show when={labels().length}>
            <div>
              <span>
                {labels().length} label{labels().length > 1 ? "s" : ""}
              </span>
            </div>
          </Show>
          <Show when={cursor()}>
            <div class="flex h-[2rem] w-[5.5rem] items-center justify-center text-nowrap">
              <Show when={!response.loading}>
                <button
                  type="button"
                  onclick={() => refetch()}
                  class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  Load More
                </button>
              </Show>
              <Show when={response.loading}>
                <div class="i-line-md-loading-twotone-loop text-xl"></div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
      <div class="break-anywhere flex flex-col gap-2 divide-y divide-neutral-500 whitespace-pre-wrap font-mono">
        <For each={labels()}>
          {(label) => (
            <div class="flex gap-2 pt-2">
              <div class="flex flex-col gap-x-2">
                <div class="flex items-center gap-x-2">
                  <div class="min-w-[5rem] font-semibold text-stone-600 dark:text-stone-400">
                    URI
                  </div>
                  <a
                    href={`/at/${label.uri.replace("at://", "")}`}
                    target="_blank"
                    class="underline"
                  >
                    {label.uri}
                  </a>
                </div>
                <Show when={label.cid}>
                  <div class="flex gap-x-2">
                    <div class="min-w-[5rem] font-semibold text-stone-600 dark:text-stone-400">
                      CID
                    </div>
                    {label.cid}
                  </div>
                </Show>
                <div class="flex gap-x-2">
                  <div class="min-w-[5rem] font-semibold text-stone-600 dark:text-stone-400">
                    Label
                  </div>
                  {label.val}
                </div>
                <div class="flex gap-x-2">
                  <div class="min-w-[5rem] font-semibold text-stone-600 dark:text-stone-400">
                    Created
                  </div>
                  {localDateFromTimestamp(new Date(label.cts).getTime())}
                </div>
                <Show when={label.exp}>
                  {(exp) => (
                    <div class="flex gap-x-2">
                      <div class="min-w-[5rem] font-semibold text-stone-600 dark:text-stone-400">
                        Expires
                      </div>
                      {localDateFromTimestamp(new Date(exp()).getTime())}
                    </div>
                  )}
                </Show>
              </div>
              <Show when={label.neg}>
                <div class="i-lucide-minus text-lg text-xl text-red-500 dark:text-red-400" />
              </Show>
              <Show when={!label.neg}>
                <div class="i-lucide-plus text-lg text-green-500 dark:text-green-400" />
              </Show>
            </div>
          )}
        </For>
      </div>
    </>
  );
};

export { LabelView };
