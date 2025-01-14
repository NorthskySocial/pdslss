import { createSignal, ErrorBoundary, Show, Suspense } from "solid-js";
import {
  action,
  Navigate,
  redirect,
  RouteSectionProps,
  useLocation,
  useNavigate,
  useParams,
  useSubmission,
} from "@solidjs/router";
import { agent, loginState, LoginStatus } from "./views/login.jsx";
import { resolveHandle } from "./utils/api.js";
import { CreateRecord } from "./components/create.jsx";
import Tooltip from "./components/tooltip.jsx";
import { NavBar } from "./components/navbar.jsx";

export const [theme, setTheme] = createSignal(
  (
    localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        globalThis.matchMedia("(prefers-color-scheme: dark)").matches)
  ) ?
    "dark"
  : "light",
);

const processInput = action(async (formData: FormData) => {
  const input = formData.get("input")?.toString();
  (document.getElementById("uriForm") as HTMLFormElement).reset();
  if (!input) return new Error("Empty input");
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
  const uriParts = uri.split("/");
  const actor = uriParts[0];
  const did = uri.startsWith("did:") ? actor : await resolveHandle(actor);
  throw redirect(
    `/at/${did}${uriParts.length > 1 ? `/${uriParts.slice(1).join("/")}` : ""}`,
  );
});

const Layout = (props: RouteSectionProps<unknown>) => {
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
  const submission = useSubmission(processInput);

  return (
    <div
      id="main"
      class="m-5 flex flex-col items-center text-slate-900 dark:text-slate-100"
    >
      <div class="mb-2 flex w-[21rem] items-center">
        <div class="flex basis-1/3 gap-x-2">
          <div
            class="w-fit cursor-pointer"
            onclick={() => {
              setTheme(theme() === "light" ? "dark" : "light");
              if (theme() === "dark")
                document.documentElement.classList.add("dark");
              else document.documentElement.classList.remove("dark");
              localStorage.theme = theme();
            }}
          >
            <Tooltip text="Theme">
              {theme() === "dark" ?
                <div class="i-tabler-moon-stars text-xl" />
              : <div class="i-tabler-sun text-xl" />}
            </Tooltip>
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
            href="https://bsky.app/profile/did:plc:b3pn34agqqchkaf75v7h43dk"
            target="_blank"
          >
            <Tooltip text="Bluesky">
              <div class="i-fa6-brands-bluesky text-xl" />
            </Tooltip>
          </a>
          <a href="https://github.com/notjuliet/pdsls" target="_blank">
            <Tooltip text="GitHub">
              <div class="i-bi-github text-xl" />
            </Tooltip>
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
                <Tooltip
                  text="Repository"
                  children={
                    <a href={`/at/${agent.sub}`} class="flex items-center">
                      <button class="i-tabler-binary-tree text-xl" />
                      <Show when={location.pathname === "/"}>
                        <Navigate href={`/at/${agent.sub}`} />
                      </Show>
                    </a>
                  }
                />
              </Show>
            </div>
          </form>
          <Show when={submission.error}>
            {(err) => <div class="mt-3">{err().message}</div>}
          </Show>
        </Show>
        <Show when={params.pds}>
          <NavBar params={params} />
        </Show>
        <Show keyed when={useLocation().pathname}>
          <ErrorBoundary
            fallback={(err) => (
              <div class="mt-3 break-words">Error: {err.message}</div>
            )}
          >
            <Suspense
              fallback={
                <div class="i-line-md-loading-twotone-loop mt-3 text-xl" />
              }
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
