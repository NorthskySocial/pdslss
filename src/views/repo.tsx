import { createSignal, onMount, For, Show, type Component } from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { ComAtprotoRepoDescribeRepo } from "@atcute/client/lexicons";
import { A, query, useParams } from "@solidjs/router";
import { setNotice, setPDS } from "../main.jsx";
import { didDocCache, resolveHandle, resolvePDS } from "../utils/api.js";

const RepoView: Component = () => {
  const params = useParams();
  const [repo, setRepo] = createSignal<ComAtprotoRepoDescribeRepo.Output>();
  const [didDoc, setDidDoc] = createSignal<any>();
  let rpc: XRPC;

  onMount(async () => {
    setNotice("Loading...");
    setPDS(params.pds);
    let pds =
      params.pds.startsWith("localhost") ?
        `http://${params.pds}`
      : `https://${params.pds}`;
    const did =
      params.repo.startsWith("did:") ?
        params.repo
      : await resolveHandle(params.repo);
    if (params.pds === "at") pds = await resolvePDS(did);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    try {
      const res = await describeRepo(did);
      setNotice("");
      setRepo(res.data);
      setDidDoc(
        (res.data.didDoc as any).id ? res.data.didDoc : didDocCache[did],
      );
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
      <div class="mb-3 flex max-w-full flex-col self-center overflow-y-auto font-mono">
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
        <div class="mt-1 font-sans text-lg">
          <A href="blobs" class="text-lightblue-500 hover:underline">
            List blobs
          </A>
        </div>
      </div>
      <Show when={didDoc()}>
        <div class="flex flex-col gap-y-1 break-words">
          <div>
            <span class="font-semibold text-stone-600 dark:text-stone-400">
              DID{" "}
            </span>
            <span>{didDoc().id}</span>
          </div>
          <div>
            <p class="font-semibold text-stone-600 dark:text-stone-400">
              Identities
            </p>
            <ul class="ml-3">
              <For each={didDoc().alsoKnownAs}>
                {(alias) => <li>{alias}</li>}
              </For>
            </ul>
          </div>
          <div>
            <p class="font-semibold text-stone-600 dark:text-stone-400">
              Services
            </p>
            <ul class="ml-3">
              <For each={didDoc().service}>
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
              <For each={didDoc().verificationMethod}>
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
            DID document <div class="i-tabler-external-link ml-0.5 text-xs" />
          </a>
          <Show when={repo()?.did.startsWith("did:plc")}>
            <a
              class="text-lightblue-500 flex w-fit items-center hover:underline"
              href={`https://boat.kelinci.net/plc-oplogs?q=${repo()?.did}`}
              target="_blank"
            >
              PLC operation logs{" "}
              <div class="i-tabler-external-link ml-0.5 text-xs" />
            </a>
          </Show>
        </div>
      </Show>
    </>
  );
};

export { RepoView };
