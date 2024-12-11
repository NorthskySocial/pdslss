import {
  createSignal,
  ErrorBoundary,
  Show,
  Suspense,
  type Component,
} from "solid-js";
import {
  A,
  action,
  Navigate,
  redirect,
  RouteSectionProps,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router";
import { agent, loginState, LoginStatus } from "./views/login.jsx";
import { resolveHandle, resolvePDS } from "./utils/api.js";
import { CreateRecord } from "./components/create.jsx";

export const [theme, setTheme] = createSignal(
  (
    localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        globalThis.matchMedia("(prefers-color-scheme: dark)").matches)
  ) ?
    "dark"
  : "light",
);
export const [notice, setNotice] = createSignal("");
export const [pds, setPDS] = createSignal<string>();
export const [validRecord, setValidRecord] = createSignal<boolean | undefined>(
  undefined,
);

const processInput = action(async (formData: FormData) => {
  setNotice("");
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
    did =
      !uri.startsWith("did:") ?
        await resolveHandle(uri.split("/")[0])
      : uri.split("/")[0];
    if (!did) throw Error;
    await resolvePDS(did);
  } catch {
    setNotice("Could not resolve AT URI");
    return;
  }
  throw redirect(
    `/at/${did}${uri.split("/").length > 1 ? "/" + uri.split("/").slice(1).join("/") : ""}`,
  );
});

const Layout: Component<RouteSectionProps<unknown>> = (props) => {
  try {
    navigator.registerProtocolHandler("web+at", "/%s");
    const pathname = decodeURIComponent(useLocation().pathname);
    if (pathname.startsWith("/web+at://")) {
      const navigate = useNavigate();
      navigate(pathname.replace("web+at://", "at/"));
    }
  } catch (err) {
    console.log(err);
  }
  const params = useParams();
  setNotice("");

  return (
    <div
      id="main"
      class="m-5 flex flex-col items-center text-slate-900 dark:text-slate-100"
    >
      <div class="mb-2 flex w-[20rem] items-center">
        <div class="flex basis-1/3 gap-x-2">
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
              <div class="i-tabler-moon-stars text-xl" />
            : <div class="i-tabler-sun text-xl" />}
          </div>
          <LoginStatus />
          <Show when={loginState()}>
            <CreateRecord />
          </Show>
        </div>
        <div class="basis-1/3 text-center font-mono text-xl font-bold">
          <a href="/" class="hover:underline">
            PDSls
          </a>
        </div>
        <div class="justify-right flex basis-1/3 items-center gap-x-2">
          <a
            title="Bluesky"
            href="https://bsky.app/profile/did:plc:b3pn34agqqchkaf75v7h43dk"
            target="_blank"
          >
            <div class="i-fa6-brands-bluesky text-xl" />
          </a>
          <a
            title="GitHub"
            href="https://github.com/notjuliet/pdsls"
            target="_blank"
          >
            <div class="i-bi-github text-xl" />
          </a>
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
            <div class="flex items-center gap-x-2">
              <input
                type="text"
                id="input"
                name="input"
                spellcheck={false}
                class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <button
                type="submit"
                class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                Go
              </button>
              <Show when={loginState()}>
                <div title={`Repository`}>
                  <a href={`/at/${agent.sub}`}>
                    <div class="i-tabler-binary-tree text-xl" />
                    <Show when={location.pathname === "/"}>
                      <Navigate href={`/at/${agent.sub}`} />
                    </Show>
                  </a>
                </div>
              </Show>
            </div>
          </form>
        </Show>
        <Show when={notice()}>
          <div class="mt-3 w-full break-words text-center">{notice()}</div>
        </Show>
        <Show when={params.pds}>
          <div class="break-anywhere mb-3 mt-4 flex min-w-[20rem] flex-col font-mono">
            <Show when={pds() && params.pds}>
              <div class="flex items-center">
                <div class="i-tabler-server mr-1 text-sm" />
                <A
                  end
                  href={pds()!}
                  inactiveClass="text-lightblue-500 hover:underline"
                >
                  {pds()}
                </A>
              </div>
            </Show>
            <div
              classList={{
                "flex flex-col flex-wrap md:flex-row": true,
                "md:mt-1": !!params.repo,
              }}
            >
              <Show when={params.repo}>
                <div class="mt-1 flex items-center md:mt-0">
                  <div class="i-atproto-logo mr-1 text-sm" />
                  <A
                    end
                    href={`at/${params.repo}`}
                    inactiveClass="text-lightblue-500 hover:underline"
                  >
                    {params.repo}
                  </A>
                </div>
              </Show>
              <Show when={params.collection}>
                <div class="mt-1 flex items-center md:mt-0">
                  <div class="i-uil-list-ul mr-1 text-sm md:hidden" />
                  <span class="mx-1 hidden md:inline">/</span>
                  <A
                    end
                    href={`at/${params.repo}/${params.collection}`}
                    inactiveClass="text-lightblue-500 hover:underline"
                  >
                    {params.collection}
                  </A>
                </div>
              </Show>
              <Show when={params.rkey}>
                <div class="mt-1 flex items-center md:mt-0">
                  <div class="i-mdi-code-json mr-1 text-sm md:hidden" />
                  <span class="mx-1 hidden md:inline">/</span>
                  <span class="cursor-pointer">{params.rkey}</span>
                  <Show when={validRecord()}>
                    <div
                      title="This record is valid"
                      class="i-fluent-checkmark-circle-12-regular ml-1"
                    />
                  </Show>
                  <Show when={validRecord() === false}>
                    <div
                      title="This record is invalid"
                      class="i-fluent-dismiss-circle-12-regular ml-1"
                    />
                  </Show>
                  <Show when={validRecord() === undefined}>
                    <div
                      title="Validating record..."
                      class="i-line-md-loading-twotone-loop ml-1"
                    />
                  </Show>
                </div>
              </Show>
            </div>
            <Show when={useLocation().pathname === `/at/${params.repo}/blobs`}>
              <div class="mt-1 flex items-center">
                <div class="i-lucide-binary mr-1 text-sm" />
                <span>blobs</span>
              </div>
            </Show>
          </div>
        </Show>
        <Show keyed when={useLocation().pathname}>
          <ErrorBoundary
            fallback={(err) => (
              <div class="break-words">Error: {err.message}</div>
            )}
          >
            <Suspense
              fallback={<div class="i-line-md-loading-twotone-loop ml-1" />}
            >
              {props.children}
            </Suspense>
          </ErrorBoundary>
        </Show>
      </div>
    </div>
  );
};

export { Layout };
