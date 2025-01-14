import { A, Params } from "@solidjs/router";
import Tooltip from "./tooltip";
import { createSignal, Show } from "solid-js";

export const [pds, setPDS] = createSignal<string>();
export const [validRecord, setValidRecord] = createSignal<boolean | undefined>(
  undefined,
);

const NavBar = (props: { params: Params }) => {
  return (
    <div class="break-anywhere mt-4 flex min-w-[21rem] flex-col font-mono">
      <Show when={pds() && props.params.pds}>
        <div class="flex items-center">
          <Tooltip text="PDS">
            <div class="i-tabler-server mr-1 text-sm" />
          </Tooltip>
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
          "md:mt-1": !!props.params.repo,
        }}
      >
        <Show when={props.params.repo}>
          <div>
            <div class="mt-1 flex items-center md:mt-0">
              <Tooltip text={window.innerWidth > 768 ? "AT URI" : "Repository"}>
                <div class="i-atproto-logo mr-1 text-sm" />
              </Tooltip>
              <A
                end
                href={`at/${props.params.repo}`}
                inactiveClass="text-lightblue-500 hover:underline"
              >
                {props.params.repo}
              </A>
            </div>
            <Show when={!props.params.collection && !props.params.rkey}>
              <div class="mt-1 flex items-center">
                <div class="i-ph-binary-bold mr-1 text-sm" />
                <A
                  end
                  href={`at/${props.params.repo}/blobs`}
                  inactiveClass="text-lightblue-500 hover:underline"
                >
                  blobs
                </A>
              </div>
            </Show>
          </div>
        </Show>
        <Show when={props.params.collection}>
          <div class="mt-1 flex items-center md:mt-0">
            <Tooltip text="Collection">
              <div class="i-uil-list-ul mr-1 text-sm md:hidden" />
            </Tooltip>
            <span class="mx-1 hidden md:inline">/</span>
            <A
              end
              href={`at/${props.params.repo}/${props.params.collection}`}
              inactiveClass="text-lightblue-500 hover:underline"
            >
              {props.params.collection}
            </A>
          </div>
        </Show>
        <Show when={props.params.rkey}>
          <div class="mt-1 flex items-center md:mt-0">
            <Tooltip text="Record">
              <div class="i-mdi-code-json mr-1 text-sm md:hidden" />
            </Tooltip>
            <span class="mx-1 hidden md:inline">/</span>
            <span class="mr-1 cursor-pointer">{props.params.rkey}</span>
            <Show when={validRecord()}>
              <Tooltip
                text="Valid record"
                children={<div class="i-fluent-checkmark-circle-12-regular" />}
              />
            </Show>
            <Show when={validRecord() === false}>
              <Tooltip
                text="Invalid record"
                children={
                  <div class="i-fluent-dismiss-circle-12-regular text-red-500 dark:text-red-400" />
                }
              />
            </Show>
            <Show when={validRecord() === undefined}>
              <Tooltip
                text="Validating"
                children={<div class="i-line-md-loading-twotone-loop" />}
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

export { NavBar };
