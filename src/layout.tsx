import { createEffect, ErrorBoundary, onMount, Show, Suspense } from "solid-js";
import { A, RouteSectionProps, useLocation, useParams } from "@solidjs/router";
import { agent, loginState, retrieveSession } from "./components/login.jsx";
import { RecordEditor } from "./components/create.jsx";
import Tooltip from "./components/tooltip.jsx";
import { NavBar } from "./components/navbar.jsx";
import { Search } from "./components/search.jsx";
import { AccountManager } from "./components/account.jsx";
import { resolveHandle } from "./utils/api.js";
import { Meta, MetaProvider } from "@solidjs/meta";
import { kawaii, Settings } from "./components/settings.jsx";
import { Handle } from "@atcute/lexicons";
import { copyNotice } from "./utils/copy.js";

const Layout = (props: RouteSectionProps<unknown>) => {
  try {
    navigator.registerProtocolHandler("web+at", "/%s");
    const pathname = decodeURIComponent(useLocation().pathname);
    if (pathname.startsWith("/web+at://")) {
      window.location.href = pathname.replace("web+at://", "at://");
    }
  } catch (err) {
    console.error(err);
  }
  const params = useParams();
  const location = useLocation();

  onMount(async () => {
    await retrieveSession();
    if (loginState() && location.pathname === "/") window.location.href = `/at://${agent.sub}`;
    if (location.search.includes("kawaii=true")) {
      localStorage.kawaii = "true";
    }
  });

  createEffect(async () => {
    if (params.repo && !params.repo.startsWith("did:")) {
      const did = await resolveHandle(params.repo as Handle);
      window.location.replace(location.pathname.replace(params.repo, did));
    }
  });

  return (
    <div id="main" class="m-5 flex flex-col items-center text-slate-900 dark:text-slate-100">
      <Show when={location.pathname !== "/"}>
        <MetaProvider>
          <Meta name="robots" content="noindex, nofollow" />
        </MetaProvider>
      </Show>
      <div class="mb-2 flex w-[21rem] items-center sm:w-[23rem]">
        <div class="flex basis-1/3 gap-x-2">
          <A href="/jetstream">
            <Tooltip text="Relay">
              <div class="i-lucide-radio-tower text-xl" />
            </Tooltip>
          </A>
          <AccountManager />
        </div>
        <div class="flex basis-1/3 justify-center text-center font-mono text-lg font-bold">
          <A href="/" class="hover:underline">
            PDSls
          </A>
          <Show when={location.search.includes("kawaii=true") || kawaii()}>
            <a
              href="https://bsky.app/profile/ninikyuu.bsky.social/post/3l3tq5xwqf22o"
              target="_blank"
            >
              <img
                src="/bluetan.png"
                title="Art by nico ღ (ninikyuu.bsky.social)"
                class="w-50px sm:w-150px md:w-200px lg:w-250px absolute z-0 sm:fixed sm:bottom-4 sm:left-0"
              />
            </a>
          </Show>
        </div>
        <div class="justify-right flex basis-1/3 items-center gap-x-2">
          <Show when={loginState()}>
            <RecordEditor create={true} />
          </Show>
          <Settings />
        </div>
      </div>
      <div class="min-w-21rem sm:min-w-23rem z-1 dark:bg-dark-800 mb-5 flex max-w-full flex-col items-center text-pretty bg-zinc-100 md:max-w-screen-md">
        <Show when={location.pathname !== "/jetstream" && location.pathname !== "/firehose"}>
          <Search />
        </Show>
        <Show when={params.pds}>
          <NavBar params={params} />
        </Show>
        <Show keyed when={location.pathname}>
          <ErrorBoundary
            fallback={(err) => <div class="mt-3 break-words">Error: {err.message}</div>}
          >
            <Suspense fallback={<div class="i-eos-icons-loading mt-3 text-2xl" />}>
              {props.children}
            </Suspense>
          </ErrorBoundary>
        </Show>
      </div>
      <Show when={copyNotice()}>
        <div class="dark:bg-dark-100 fixed bottom-5 z-10 flex items-center rounded-md bg-neutral-200 p-2 shadow-md">
          <div class="i-lucide-clipboard-check mr-1 text-xl" />
          Copied to clipboard
        </div>
      </Show>
    </div>
  );
};

export { Layout };
