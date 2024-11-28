import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { ComAtprotoRepoDescribeRepo } from "@atcute/client/lexicons";
import { A, query, useParams } from "@solidjs/router";
import { TbExternalLink } from "../components/svg.jsx";
import { setNotice, setPDS } from "../main.jsx";
import { resolvePDS } from "../utils/api.js";

const RepoView: Component = () => {
  const params = useParams();
  const [repo, setRepo] = createSignal<ComAtprotoRepoDescribeRepo.Output>();
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
    try {
      const res = await describeRepo(params.repo);
      setNotice("");
      setRepo(res.data);
    } catch (err: any) {
      setNotice(err.message);
    }
  });

  const describeRepo = query(
    (repo: string) =>
      rpc.get("com.atproto.repo.describeRepo", { params: { repo: repo } }),
    "describeRepo",
  );

  return (
    <>
      <div class="mb-3 flex max-w-full flex-col self-center overflow-y-auto">
        <For each={repo()?.collections}>
          {(collection) => (
            <A
              href={`${collection}`}
              class="text-lightblue-500 hover:underline"
            >
              {collection}
            </A>
          )}
        </For>
      </div>
      <Show when={repo()}>
        <div class="flex flex-col gap-y-1 break-words font-sans">
          <div>
            <span class="font-semibold text-stone-600 dark:text-stone-400">
              DID{" "}
            </span>
            <span>{(repo()?.didDoc as any).id}</span>
          </div>
          <div>
            <p class="font-semibold text-stone-600 dark:text-stone-400">
              Identities
            </p>
            <ul class="ml-3">
              <For each={(repo()?.didDoc as any).alsoKnownAs}>
                {(alias) => <li>{alias}</li>}
              </For>
            </ul>
          </div>
          <div>
            <p class="font-semibold text-stone-600 dark:text-stone-400">
              Services
            </p>
            <ul class="ml-3">
              <For each={(repo()?.didDoc as any).service}>
                {(service) => (
                  <li class="flex flex-col">
                    <span>{service.id}</span>
                    <a
                      class="text-lightblue-500 w-fit hover:underline"
                      href={service.serviceEndpoint}
                      target="_blank"
                    >
                      {service.serviceEndpoint}
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </div>
          <div>
            <p class="font-semibold text-stone-600 dark:text-stone-400">
              Verification methods
            </p>
            <ul class="ml-3">
              <For each={(repo()?.didDoc as any).verificationMethod}>
                {(verif) => (
                  <li class="flex flex-col">
                    <span>#{verif.id.split("#")[1]}</span>
                    <span>{verif.publicKeyMultibase}</span>
                  </li>
                )}
              </For>
            </ul>
          </div>
          <a
            class="text-lightblue-500 flex w-fit items-center hover:underline"
            href={
              repo()?.did.startsWith("did:plc") ?
                `https://plc.directory/${repo()?.did}`
              : `https://${repo()?.did.split("did:web:")[1]}/.well-known/did.json`
            }
            target="_blank"
          >
            DID document <TbExternalLink class="ml-0.5 size-3.5" />
          </a>
          <Show when={repo()?.did.startsWith("did:plc")}>
            <a
              class="text-lightblue-500 flex w-fit items-center hover:underline"
              href={`https://boat.kelinci.net/plc-oplogs?q=${repo()?.did}`}
              target="_blank"
            >
              PLC operation logs <TbExternalLink class="ml-0.5 size-3.5" />
            </a>
          </Show>
        </div>
      </Show>
    </>
  );
};

export { RepoView };
