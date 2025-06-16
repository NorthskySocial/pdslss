import { createSignal, For, Show, createResource } from "solid-js";
import { Client, CredentialManager } from "@atcute/client";
import { A, useParams } from "@solidjs/router";
import { setPDS } from "../components/navbar";
import Tooltip from "../components/tooltip";
import { InferXRPCBodyOutput } from "@atcute/lexicons";
import { ComAtprotoServerDescribeServer, ComAtprotoSyncListRepos } from "@atcute/atproto";

const LIMIT = 1000;

// TODO: move this somewhere else
const Field = ({
  label,
  value,
  truncate,
  inline = true,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  inline?: boolean;
}) => {
  const [fullField, setFullField] = createSignal(false);

  return (
    <div classList={{ "flex gap-x-1": true, "flex-col": !inline }}>
      <span class="font-semibold text-stone-600 dark:text-stone-400">{label}</span>
      <Show when={truncate}>
        <button
          classList={{ "bg-transparent break-anywhere text-left": true, truncate: !fullField() }}
          onclick={() => setFullField(!fullField())}
        >
          {value}
        </button>
      </Show>
      <Show when={!truncate}>
        <span class="break-anywhere">{value}</span>
      </Show>
    </div>
  );
};

const PdsView = () => {
  const params = useParams();
  if (params.pds.startsWith("web%2Bat%3A%2F%2F")) return;
  const [version, setVersion] = createSignal<string>();
  const [serverInfos, setServerInfos] =
    createSignal<InferXRPCBodyOutput<ComAtprotoServerDescribeServer.mainSchema["output"]>>();
  const [cursor, setCursor] = createSignal<string>();
  setPDS(params.pds);
  const pds = params.pds.startsWith("localhost") ? `http://${params.pds}` : `https://${params.pds}`;
  const rpc = new Client({ handler: new CredentialManager({ service: pds }) });

  const listRepos = async (cursor: string | undefined) =>
    await rpc.get("com.atproto.sync.listRepos", {
      params: { limit: LIMIT, cursor: cursor },
    });

  const describeServer = async () => await rpc.get("com.atproto.server.describeServer");

  const getVersion = async () => {
    // @ts-expect-error: undocumented endpoint
    const res = await rpc.get("_health", {});
    setVersion((res.data as any).version);
  };

  const fetchRepos = async (): Promise<
    InferXRPCBodyOutput<ComAtprotoSyncListRepos.mainSchema["output"]>
  > => {
    await getVersion();
    const describeRes = await describeServer();
    if (!describeRes.ok) console.error(describeRes.data.error);
    else setServerInfos(describeRes.data);
    const res = await listRepos(cursor());
    if (!res.ok) throw new Error(res.data.error);
    setCursor(res.data.repos.length < LIMIT ? undefined : res.data.cursor);
    setRepos(repos()?.concat(res.data.repos) ?? res.data.repos);
    await getVersion();
    return res.data;
  };

  const [response, { refetch }] = createResource(fetchRepos);
  const [repos, setRepos] = createSignal<ComAtprotoSyncListRepos.Repo[]>();

  return (
    <Show when={repos() || response()}>
      <div class="mt-3 flex w-[21rem] flex-col sm:w-[23rem]">
        <Show when={version()}>
          {(version) => <Field label="Version" value={version()} truncate />}
        </Show>
        <Show when={serverInfos()}>
          {(server) => (
            <>
              <Field label="DID" value={server().did} truncate />
              <Show when={server().inviteCodeRequired}>
                <Field
                  label="Invite Code Required"
                  value={server().inviteCodeRequired ? "Yes" : "No"}
                />
              </Show>
              <Show when={server().phoneVerificationRequired}>
                <Field
                  label="Phone Verification Required"
                  value={server().phoneVerificationRequired ? "Yes" : "No"}
                />
              </Show>
              <Show when={server().availableUserDomains.length}>
                <div class="flex flex-col">
                  <span class="font-semibold text-stone-600 dark:text-stone-400">
                    Available User Domains
                  </span>
                  <For each={server().availableUserDomains}>
                    {(domain) => <span class="break-anywhere">{domain}</span>}
                  </For>
                </div>
              </Show>
            </>
          )}
        </Show>
        <p class="w-full font-semibold text-stone-600 dark:text-stone-400">Repositories</p>
        <For each={repos()}>
          {(repo) => (
            <A
              href={`/at://${repo.did}`}
              classList={{
                "w-full flex font-mono relative": true,
                "text-lightblue-500": repo.active,
                "text-gray-300 dark:text-gray-600": !repo.active,
              }}
            >
              <Show when={!repo.active}>
                <div class="absolute -left-5">
                  <Tooltip text={repo.status ?? "???"}>
                    <span>🪦</span>
                  </Tooltip>
                </div>
              </Show>
              <span class="w-full hover:underline">{repo.did}</span>
            </A>
          )}
        </For>
        <div class="flex w-full justify-center">
          <Show when={cursor() && !response.loading}>
            <button
              type="button"
              onclick={() => refetch()}
              class="dark:hover:bg-dark-300 mt-1 rounded-lg border border-gray-400 bg-transparent px-2.5 py-1.5 text-sm font-bold hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              Load More
            </button>
          </Show>
          <Show when={response.loading}>
            <div class="i-line-md-loading-twotone-loop mt-2 text-xl"></div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export { PdsView };
