import {
  createSignal,
  onMount,
  For,
  Show,
  type Component,
  onCleanup,
  createEffect,
} from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import {
  ComAtprotoRepoDescribeRepo,
  ComAtprotoRepoGetRecord,
  ComAtprotoRepoListRecords,
  ComAtprotoSyncListRepos,
} from "@atcute/client/lexicons";
import {
  A,
  action,
  query,
  redirect,
  RouteSectionProps,
  useLocation,
  useParams,
} from "@solidjs/router";
import { JSONValue } from "./components/json.jsx";
import {
  AiFillGithub,
  Bluesky,
  BsClipboard,
  BsClipboardCheck,
  TbMoonStar,
  TbSun,
} from "./components/svg.jsx";
import { authenticate_post_with_doc } from "public-transport";
import { agent, loginState, LoginStatus } from "./components/login.jsx";
import { Editor } from "./components/editor.jsx";
import { editor } from "monaco-editor";

const [theme, setTheme] = createSignal(
  (
    localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        globalThis.matchMedia("(prefers-color-scheme: dark)").matches)
  ) ?
    "dark"
  : "light",
);
let rpc = new XRPC({
  handler: new CredentialManager({ service: "https://public.api.bsky.app" }),
});
const [notice, setNotice] = createSignal("");
const [pds, setPDS] = createSignal<string>();

const didPDSCache: { [key: string]: string } = {};
const didDocCache: { [key: string]: {} } = {};
const getPDS = query(async (did: string) => {
  if (did in didPDSCache) return didPDSCache[did];
  const res = await fetch(
    did.startsWith("did:web") ?
      `https://${did.split(":")[2]}/.well-known/did.json`
    : "https://plc.directory/" + did,
  );

  return res.json().then((doc) => {
    for (const service of doc.service) {
      if (service.id === "#atproto_pds") {
        didPDSCache[did] = service.serviceEndpoint;
        didDocCache[did] = doc;
        return service.serviceEndpoint;
      }
    }
  });
}, "getPDS");

const processInput = action(async (formData: FormData) => {
  const input = formData.get("input")?.toString();
  (document.getElementById("uriForm") as HTMLFormElement).reset();
  if (!input) return;
  if (
    !input.startsWith("https://bsky.app/") &&
    !input.startsWith("https://main.bsky.dev/") &&
    (input.startsWith("https://") || input.startsWith("http://"))
  )
    throw redirect(
      `/${input.replace("https://", "").replace("http://", "").replace("/", "")}`,
    );

  const uri = input
    .replace("at://", "")
    .replace("https://bsky.app/profile/", "")
    .replace("https://main.bsky.dev/profile/", "")
    .replace("/post/", "/app.bsky.feed.post/");
  let did = "";
  try {
    rpc = new XRPC({
      handler: new CredentialManager({
        service: "https://public.api.bsky.app",
      }),
    });
    await resolvePDS(uri.split("/")[0]);
    did =
      !uri.startsWith("did:") ?
        await resolveHandle(uri.split("/")[0])
      : uri.split("/")[0];
    if (!did) throw Error;
  } catch {
    setNotice("Could not resolve AT URI");
    return;
  }
  throw redirect(
    `/at/${did}${uri.split("/").length > 1 ? "/" + uri.split("/").slice(1).join("/") : ""}`,
  );
});

const resolveHandle = async (handle: string) => {
  const res = await rpc.get("com.atproto.identity.resolveHandle", {
    params: { handle: handle },
  });
  return res.data.did;
};

const resolvePDS = async (repo: string) => {
  try {
    let did = repo;
    if (!repo.startsWith("did:")) did = await resolveHandle(repo);
    if (!did) throw Error;
    const pds = await getPDS(did);
    setPDS(pds.replace("https://", "").replace("http://", ""));
    return pds;
  } catch {
    setNotice("Could not resolve PDS");
  }
};

const RecordView: Component = () => {
  const params = useParams();
  const [record, setRecord] = createSignal<ComAtprotoRepoGetRecord.Output>();
  const [modal, setModal] = createSignal<HTMLDialogElement>();
  const [openDelete, setOpenDelete] = createSignal(false);
  const [openEdit, setOpenEdit] = createSignal(false);
  const [editNotice, setEditNotice] = createSignal("");
  let model: editor.IModel;

  let clickEvent = (event: MouseEvent) => {
    if (modal() && event.target == modal()) {
      setOpenDelete(false);
      setOpenEdit(false);
    }
  };
  let keyEvent = (event: KeyboardEvent) => {
    if (modal() && event.key == "Escape") {
      setOpenDelete(false);
      setOpenEdit(false);
    }
  };

  onMount(async () => {
    window.addEventListener("click", clickEvent);
    window.addEventListener("keydown", keyEvent);
    setNotice("Loading...");
    setPDS(params.pds);
    let pds =
      params.pds.startsWith("localhost") ?
        `http://${params.pds}`
      : `https://${params.pds}`;
    if (params.pds === "at") pds = await resolvePDS(params.repo);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    try {
      const res = await getRecord(params.repo, params.collection, params.rkey);
      setNotice("Validating...");
      setRecord(res.data);
      await authenticate_post_with_doc(
        res.data.uri,
        res.data.cid!,
        res.data.value,
        didDocCache[params.repo],
      );
      setNotice("");
    } catch (err: any) {
      if (err.message) setNotice(err.message);
      else setNotice(`Invalid Record: ${err}`);
    }
  });

  onCleanup(() => {
    window.removeEventListener("click", clickEvent);
    window.removeEventListener("keydown", keyEvent);
  });

  const getRecord = query(
    (repo: string, collection: string, rkey: string) =>
      rpc.get("com.atproto.repo.getRecord", {
        params: { repo: repo, collection: collection, rkey: rkey },
      }),
    "getRecord",
  );

  const editRecord = action(async () => {
    const record = model.getValue();
    if (!record) return;
    rpc = new XRPC({ handler: agent });
    try {
      await rpc.call("com.atproto.repo.putRecord", {
        data: {
          repo: params.repo,
          collection: params.collection,
          rkey: params.rkey,
          record: JSON.parse(record.toString()),
        },
      });
    } catch {
      setEditNotice("Invalid input");
      return;
    }
    setOpenEdit(false);
    setTimeout(async () => window.location.reload(), 500);
  });

  const deleteRecord = action(async () => {
    rpc = new XRPC({ handler: agent });
    rpc.call("com.atproto.repo.deleteRecord", {
      data: {
        repo: params.repo,
        collection: params.collection,
        rkey: params.rkey,
      },
    });
    throw redirect(`/at/${params.repo}/${params.collection}`);
  });

  createEffect(() => {
    if (openDelete() || openEdit()) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    setEditNotice("");
  });

  return (
    <Show when={record()}>
      <Show when={loginState() && agent.sub === params.repo}>
        <div class="flex w-full justify-center gap-x-2">
          <Show when={openEdit()}>
            <dialog
              ref={setModal}
              class="fixed left-0 top-0 z-[2] flex h-screen w-screen items-center justify-center bg-transparent font-sans"
            >
              <div class="dark:bg-dark-400 rounded-md border border-slate-900 bg-slate-100 p-4 text-slate-900 dark:border-slate-100 dark:text-slate-100">
                <h3 class="mb-2 text-lg font-bold">Editing record</h3>
                <form action={editRecord} method="post">
                  <Editor theme={theme()} model={model!} />
                  <div class="mt-2 flex w-full justify-end gap-2">
                    <div class="justify-start text-red-500 dark:text-red-400">
                      {editNotice()}
                    </div>
                    <button
                      onclick={() => setOpenEdit(false)}
                      class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:focus:ring-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="rounded-lg bg-green-500 px-2.5 py-1.5 text-sm font-bold text-slate-100 hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:bg-green-600 dark:hover:bg-green-500 dark:focus:ring-slate-300"
                    >
                      Confirm
                    </button>
                  </div>
                </form>
              </div>
            </dialog>
          </Show>
          <button
            onclick={() => {
              model = editor.createModel(
                JSON.stringify(record()?.value, null, 2),
                "json",
              );
              setOpenEdit(true);
            }}
            class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:focus:ring-slate-300"
          >
            Edit
          </button>
          <Show when={openDelete()}>
            <dialog
              ref={setModal}
              class="fixed left-0 top-0 z-[2] flex h-screen w-screen items-center justify-center bg-transparent font-sans"
            >
              <div class="dark:bg-dark-400 rounded-md border border-slate-900 bg-slate-100 p-4 text-slate-900 dark:border-slate-100 dark:text-slate-100">
                <h3 class="text-lg font-bold">Delete this record?</h3>
                <form action={deleteRecord} method="post">
                  <div class="mt-2 inline-flex gap-2">
                    <button
                      onclick={() => setOpenDelete(false)}
                      class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:focus:ring-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="rounded-lg bg-red-500 px-2.5 py-1.5 text-sm font-bold text-slate-100 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:bg-red-600 dark:hover:bg-red-500 dark:focus:ring-slate-300"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            </dialog>
          </Show>
          <button
            onclick={() => setOpenDelete(true)}
            class="rounded-lg bg-red-500 px-2.5 py-1.5 font-sans text-sm font-bold text-slate-100 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:bg-red-600 dark:hover:bg-red-500 dark:focus:ring-slate-300"
          >
            Delete
          </button>
        </div>
      </Show>
      <div class="overflow-y-auto pl-4">
        <JSONValue data={record() as any} repo={record()!.uri.split("/")[2]} />
      </div>
    </Show>
  );
};

const CollectionView: Component = () => {
  const params = useParams();
  const [cursorRecord, setCursorRecord] = createSignal<string>();
  const [records, setRecords] =
    createSignal<ComAtprotoRepoListRecords.Record[]>();

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

const RepoView: Component = () => {
  const params = useParams();
  const [repo, setRepo] = createSignal<ComAtprotoRepoDescribeRepo.Output>();

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
      <div class="flex max-w-full flex-col self-center overflow-y-auto">
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
        <div class="overflow-y-auto pl-4 text-sm">
          <JSONValue data={repo()?.didDoc as any} repo={repo()!.did} />
        </div>
      </Show>
    </>
  );
};

const PdsView: Component = () => {
  const params = useParams();
  const [cursorRepo, setCursorRepo] = createSignal<string>();
  const [repos, setRepos] = createSignal<ComAtprotoSyncListRepos.Repo[]>();

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

const Home: Component = () => {
  setNotice("");
  return (
    <div class="mt-3 flex flex-col break-words font-sans">
      <div>
        <span class="font-semibold text-orange-400">PDS URL</span> (https://
        required):
        <div>
          <a href="/pds.bsky.mom" class="text-lightblue-500 hover:underline">
            https://pds.bsky.mom
          </a>
        </div>
      </div>
      <div>
        <span class="font-semibold text-orange-400">AT URI</span> (at://
        optional, DID or handle alone also works):
        <div>
          <a
            href="/at/did:plc:oisofpd7lj26yvgiivf3lxsi/app.bsky.feed.post/3l2zpbbhuvw2h"
            class="text-lightblue-500 hover:underline"
          >
            at://did:plc:oisofpd7lj26yvgiivf3lxsi/app.bsky.feed.post/3l2zpbbhuvw2h
          </a>
        </div>
      </div>
      <div>
        <span class="font-semibold text-orange-400">Bluesky Link</span> (posts
        and profiles):
        <div>
          <a
            href="/at/did:plc:ia76kvnndjutgedggx2ibrem/app.bsky.feed.post/3kenlltlvus2u"
            class="text-lightblue-500 hover:underline"
          >
            https://bsky.app/profile/mary.my.id/post/3kenlltlvus2u
          </a>
        </div>
      </div>
    </div>
  );
};

const Layout: Component<RouteSectionProps<unknown>> = (props) => {
  const params = useParams();
  const [clip, setClip] = createSignal(false);
  setNotice("");

  return (
    <div
      id="main"
      class="m-5 flex flex-col items-center text-slate-900 dark:text-slate-100"
    >
      <div class="mb-2 flex w-[20rem] items-center">
        <div class="flex basis-1/3 gap-x-2">
          <LoginStatus />
        </div>
        <div class="basis-1/3 text-center font-mono text-xl font-bold">
          <a href="/" class="hover:underline">
            PDSls
          </a>
        </div>
        <div class="justify-right flex basis-1/3 gap-x-2">
          <a
            title="Bluesky"
            href="https://bsky.app/profile/did:plc:b3pn34agqqchkaf75v7h43dk"
            target="_blank"
          >
            <Bluesky class="size-6" />
          </a>
          <a
            title="GitHub"
            href="https://github.com/notjuliet/pdsls"
            target="_blank"
          >
            <AiFillGithub class="size-6" />
          </a>
          <div
            class="w-fit cursor-pointer"
            title="Theme"
            onclick={() => {
              setTheme(theme() === "light" ? "dark" : "light");
              if (theme() === "dark")
                document.documentElement.classList.add("dark");
              else document.documentElement.classList.remove("dark");
              localStorage.theme = theme();
            }}
          >
            {theme() === "dark" ?
              <TbMoonStar class="size-6" />
            : <TbSun class="size-6" />}
          </div>
        </div>
      </div>
      <div class="mb-5 flex max-w-full flex-col items-center text-pretty lg:max-w-screen-lg">
        <Show when={useLocation().pathname !== "/login"}>
          <form
            class="flex flex-col items-center gap-y-1"
            id="uriForm"
            method="post"
            action={processInput}
          >
            <div class="w-full">
              <label for="input" class="ml-0.5 text-sm">
                PDS URL or AT URI
              </label>
            </div>
            <div class="flex gap-x-2">
              <input
                type="text"
                id="input"
                name="input"
                autofocus
                spellcheck={false}
                class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <button
                type="submit"
                class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                Go
              </button>
            </div>
          </form>
        </Show>
        <Show when={params.pds}>
          <div class="mb-3 mt-4 flex flex-wrap font-mono">
            <Show when={pds() && params.pds}>
              <A
                end
                href={pds()!}
                inactiveClass="text-lightblue-500 hover:underline"
              >
                {pds()}
              </A>
            </Show>
            <Show when={params.repo}>
              <span class="mx-1.5">/</span>
              <A
                end
                href={`at/${params.repo}`}
                inactiveClass="text-lightblue-500 hover:underline"
              >
                {params.repo}
              </A>
            </Show>
            <Show when={params.collection}>
              <span class="mx-1.5">/</span>
              <A
                end
                href={`at/${params.repo}/${params.collection}`}
                inactiveClass="text-lightblue-500 hover:underline"
              >
                {params.collection}
              </A>
            </Show>
            <Show when={params.rkey}>
              <span class="mx-1.5">/</span>
              {params.rkey}
            </Show>
            <span
              title="Copy URL"
              class="ml-1.5 flex cursor-pointer items-center"
              onclick={() =>
                navigator.clipboard.writeText(location.href).then(() => {
                  setClip(true);
                  setTimeout(() => {
                    setClip(false);
                  }, 3000);
                })
              }
            >
              {clip() ?
                <BsClipboardCheck class="size-4" />
              : <BsClipboard class="size-4" />}
            </span>
          </div>
        </Show>
        <Show when={notice()}>
          <div class="mb-3 w-full break-words text-center">{notice()}</div>
        </Show>
        <div class="flex max-w-full flex-col space-y-1 font-mono">
          <Show keyed when={useLocation().pathname}>
            {props.children}
          </Show>
        </div>
      </div>
    </div>
  );
};

export { Layout, Home, PdsView, RepoView, CollectionView, RecordView };
