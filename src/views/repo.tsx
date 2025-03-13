import { A, query, useParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import { simpleFetchHandler, XRPC } from "@atcute/client";
import { defs, type DidDocument } from "@atcute/identity";

import { Backlinks } from "../components/backlinks.jsx";
import {
  getAllBacklinks,
  LinkData,
  resolveHandle,
  resolvePDS,
} from "../utils/api.js";

const RepoView = () => {
  const params = useParams();
  const [didDoc, setDidDoc] = createSignal<DidDocument>();
  const [backlinks, setBacklinks] = createSignal<{
    links: LinkData;
    target: string;
  }>();
  let rpc: XRPC;
  let did = params.repo;

  const describeRepo = query(
    (repo: string) =>
      rpc.get("com.atproto.repo.describeRepo", { params: { repo: repo } }),
    "describeRepo",
  );

  const fetchRepo = async () => {
    if (!did.startsWith("did:")) did = await resolveHandle(params.repo);
    const pds = await resolvePDS(did);
    rpc = new XRPC({ handler: simpleFetchHandler({ service: pds }) });
    const res = await describeRepo(did);

    const didDocument = defs.didDocument.parse(res.data.didDoc);
    setDidDoc(didDocument);

    if (localStorage.backlinks === "true") {
      try {
        const backlinks = await getAllBacklinks(did);
        setBacklinks({ links: backlinks.links, target: did });
      } catch (e) {
        console.error(e);
      }
    }
    return res.data;
  };

  const [repo] = createResource(fetchRepo);

  return (
    <Show when={repo()}>
      <div class="mt-3 flex w-[21rem] flex-col gap-2 break-words">
        <div class="flex flex-col border-b border-neutral-500 pb-2 font-mono">
          <p class="font-sans font-semibold text-stone-600 dark:text-stone-400">
            Collections
          </p>
          <For each={repo()?.collections}>
            {(collection) => (
              <A
                href={`/at://${did}/${collection}`}
                class="text-lightblue-500 break-anywhere w-full hover:underline"
              >
                {collection}
              </A>
            )}
          </For>
        </div>
        <Show when={didDoc()}>
          {(didDocument) => (
            <div class="flex flex-col gap-y-1">
              <div>
                <span class="font-semibold text-stone-600 dark:text-stone-400">
                  ID{" "}
                </span>
                <span>{didDocument().id}</span>
              </div>
              <div>
                <p class="font-semibold text-stone-600 dark:text-stone-400">
                  Identities
                </p>
                <ul class="ml-3">
                  <For each={didDocument().alsoKnownAs}>
                    {(alias) => <li>{alias}</li>}
                  </For>
                </ul>
              </div>
              <div>
                <p class="font-semibold text-stone-600 dark:text-stone-400">
                  Services
                </p>
                <ul class="ml-3">
                  <For each={didDocument().service}>
                    {(service) => (
                      <li class="flex flex-col">
                        <span>
                          {(() => {
                            const id = service.id;
                            const [controller, key] = id.split("#");
                            if (controller === didDocument().id) {
                              return `#${key}`;
                            }

                            return id;
                          })()}
                        </span>
                        <a
                          class="text-lightblue-500 w-fit hover:underline"
                          href={service.serviceEndpoint.toString()}
                          target="_blank"
                        >
                          {service.serviceEndpoint.toString()}
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
                  <For each={didDocument().verificationMethod}>
                    {(verif) => (
                      <li class="flex flex-col">
                        <span>
                          {(() => {
                            const id = verif.id;
                            const [controller, key] = id.split("#");
                            if (controller === didDocument().id) {
                              return `#${key}`;
                            }

                            return id;
                          })()}
                        </span>
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
                DID document{" "}
                <div class="i-tabler-external-link ml-0.5 text-xs" />
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
              <Show when={backlinks()}>
                {(backlinks) => (
                  <div class="mt-2 border-t border-neutral-500 pt-2">
                    <Backlinks
                      links={backlinks().links}
                      target={backlinks().target}
                    />
                  </div>
                )}
              </Show>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
};

export { RepoView };
