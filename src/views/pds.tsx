import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { ComAtprotoSyncListRepos } from "@atcute/client/lexicons";
import { A, useParams } from "@solidjs/router";
import { setNotice, setPDS } from "../main";

const PdsView: Component = () => {
  const params = useParams();
  const [cursorRepo, setCursorRepo] = createSignal<string>();
  const [repos, setRepos] = createSignal<ComAtprotoSyncListRepos.Repo[]>();
  let rpc: XRPC;

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    const pds =
      params.pds.startsWith("localhost") ?
        `http://${params.pds}`
      : `https://${params.pds}`;
    rpc = new XRPC({
      handler: new CredentialManager({ service: pds }),
    });
    await fetchRepos();
  });

  const fetchRepos = async () => {
    try {
      const res = await listRepos(cursorRepo());
      setCursorRepo(res.data.repos.length < 1000 ? undefined : res.data.cursor);
      setRepos(repos()?.concat(res.data.repos) ?? res.data.repos);
      setNotice("");
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  const listRepos = (cursor: string | undefined) =>
    rpc.get("com.atproto.sync.listRepos", {
      params: { limit: 1000, cursor: cursor },
    });

  return (
    <>
      <For each={repos()}>
        {(repo) => (
          <A
            href={`/at/${repo.did}`}
            classList={{
              "hover:underline relative": true,
              "text-lightblue-500": repo.active,
              "text-gray-300 dark:text-gray-600": !repo.active,
            }}
          >
            <span class="absolute -left-5 font-sans">
              {!repo.active ? "🪦" : ""}
            </span>
            {repo.did}
          </A>
        )}
      </For>
      <Show when={cursorRepo()}>
        <button
          type="button"
          onclick={() => fetchRepos()}
          class="dark:bg-dark-700 dark:hover:bg-dark-800 mt-1 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Load More
        </button>
      </Show>
    </>
  );
};

export { PdsView };
