import { createSignal, onMount, Show, onCleanup, createEffect } from "solid-js";
import { Client } from "@atcute/client";
import { agent } from "../components/login.jsx";
import { editor, Editor } from "../components/editor.jsx";
import * as monaco from "monaco-editor";
import { theme } from "../components/settings.jsx";
import Tooltip from "./tooltip.jsx";

const CreateRecord = () => {
  const [modal, setModal] = createSignal<HTMLDialogElement>();
  const [openCreate, setOpenCreate] = createSignal(false);
  const [createNotice, setCreateNotice] = createSignal("");
  const [uploading, setUploading] = createSignal(false);
  let model: monaco.editor.IModel;
  let formRef!: HTMLFormElement;

  const placeholder = (date: string) => {
    return {
      $type: "app.bsky.feed.post",
      text: "This post was sent from PDSls",
      embed: {
        $type: "app.bsky.embed.external",
        external: {
          uri: "https://pdsls.dev",
          title: "PDSls",
          description: "Browse and manage atproto repositories",
        },
      },
      langs: ["en"],
      createdAt: date,
    };
  };

  const keyEvent = (event: KeyboardEvent) => {
    if (modal() && event.key == "Escape") setOpenCreate(false);
  };

  onMount(() => window.addEventListener("keydown", keyEvent));

  onCleanup(() => window.removeEventListener("keydown", keyEvent));

  const createRecord = async (formData: FormData) => {
    const rpc = new Client({ handler: agent });
    const collection = formData.get("collection");
    const rkey = formData.get("rkey");
    const validate = formData.get("validate")?.toString();
    let record: any;
    try {
      record = JSON.parse(model.getValue());
    } catch (e: any) {
      setCreateNotice(e.message);
      return;
    }
    const res = await rpc.post("com.atproto.repo.createRecord", {
      input: {
        repo: agent.sub,
        collection: collection ? collection.toString() : record.$type,
        rkey: rkey?.toString().length ? rkey?.toString() : undefined,
        record: record,
        validate:
          validate === "true" ? true
          : validate === "false" ? false
          : undefined,
      },
    });
    if (!res.ok) {
      setCreateNotice(res.data.error);
      return;
    }
    setOpenCreate(false);
    window.location.href = `/${res.data.uri}`;
  };

  const uploadBlob = async () => {
    setCreateNotice("");
    const file = (document.getElementById("blob") as HTMLInputElement)?.files?.[0];
    if (!file) return;
    (document.getElementById("blob") as HTMLInputElement).value = "";
    const rpc = new Client({ handler: agent });
    setUploading(true);
    const res = await rpc.post("com.atproto.repo.uploadBlob", {
      input: file,
    });
    setUploading(false);
    if (!res.ok) {
      setCreateNotice(res.data.error);
      return;
    }
    editor.executeEdits("editor", [
      {
        range: editor.getSelection() as monaco.IRange,
        text: JSON.stringify(res.data.blob, null, 2),
      },
    ]);
    editor.trigger("editor", "editor.action.formatDocument", {});
  };

  createEffect(() => {
    if (openCreate()) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    setCreateNotice("");
  });

  const createModel = () => {
    if (!model)
      model = monaco.editor.createModel(
        JSON.stringify(placeholder(new Date().toISOString()), null, 2),
        "json",
      );
  };

  return (
    <>
      <Show when={openCreate()}>
        <dialog
          ref={setModal}
          class="backdrop-brightness-60 fixed left-0 top-0 z-20 flex h-screen w-screen items-center justify-center bg-transparent"
        >
          <div class="dark:bg-dark-400 rounded-md border border-slate-900 bg-zinc-100 p-4 text-slate-900 dark:border-slate-100 dark:text-slate-100">
            <h3 class="mb-2 text-lg font-bold">Creating record</h3>
            <form ref={formRef} class="flex flex-col gap-y-3">
              <div class="flex w-fit flex-col gap-y-2">
                <div class="flex items-center gap-x-2">
                  <label for="collection" class="min-w-20 select-none">
                    Collection
                  </label>
                  <input
                    id="collection"
                    name="collection"
                    type="text"
                    spellcheck={false}
                    placeholder="Optional (default: record type)"
                    size={22}
                    class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
                <div class="flex items-center gap-x-2">
                  <label for="rkey" class="min-w-20 select-none">
                    Record key
                  </label>
                  <input
                    id="rkey"
                    name="rkey"
                    type="text"
                    spellcheck={false}
                    placeholder="Optional"
                    size={22}
                    class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
                <div class="flex items-center gap-x-2">
                  <label for="validate" class="min-w-20 select-none">
                    Validate
                  </label>
                  <select
                    name="validate"
                    id="validate"
                    class="dark:bg-dark-100 rounded-lg border border-gray-400 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="unset">Unset</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <input type="file" id="blob" />
                  <div class="flex min-h-9 flex-row items-center gap-1">
                    <Show when={!uploading()}>
                      <button
                        type="button"
                        onclick={() => uploadBlob()}
                        class="dark:hover:bg-dark-300 w-fit rounded-lg border border-gray-400 bg-transparent px-2 py-1 hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      >
                        Upload
                      </button>
                      <p class="text-sm">Metadata will be pasted after cursor</p>
                    </Show>
                    <Show when={uploading()}>
                      <div class="i-line-md-loading-twotone-loop text-xl" />
                    </Show>
                  </div>
                </div>
              </div>
              <Editor theme={theme().color} model={model!} />
              <div class="flex flex-col gap-2">
                <Show when={createNotice()}>
                  <div class="text-red-500 dark:text-red-400">{createNotice()}</div>
                </Show>
                <div class="flex items-center justify-end gap-2">
                  <button
                    onclick={() => setOpenCreate(false)}
                    class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-zinc-200 focus:outline-none focus:ring-1 focus:ring-slate-700 dark:focus:ring-slate-300"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onclick={() => createRecord(new FormData(formRef))}
                    class="rounded-lg bg-green-500 px-2.5 py-1.5 text-sm font-bold text-slate-100 hover:bg-green-400 focus:outline-none focus:ring-1 focus:ring-slate-700 dark:bg-green-600 dark:hover:bg-green-500 dark:focus:ring-slate-300"
                  >
                    Create
                  </button>
                </div>
              </div>
            </form>
          </div>
        </dialog>
      </Show>
      <Tooltip
        text="Create record"
        children={
          <button
            class="i-lucide-square-pen cursor-pointer text-xl"
            onclick={() => {
              createModel();
              setOpenCreate(true);
            }}
          />
        }
      />
    </>
  );
};

export { CreateRecord };
