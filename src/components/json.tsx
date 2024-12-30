import VideoPlayer from "./video-player";
import { createSignal, For } from "solid-js";

interface AtBlob {
  $type: string;
  ref: { $link: string };
  mimeType: string;
}

const JSONString = ({ data }: { data: string }) => {
  const isURL =
    URL.canParse ??
    ((url, base) => {
      try {
        new URL(url, base);
        return true;
      } catch {
        return false;
      }
    });

  return (
    <span class="text-stone-800 dark:text-stone-200">
      {data.startsWith("at://") && data.split(" ").length === 1 ?
        <a class="underline" href={data.replace("at://", "/at/")}>
          {data}
        </a>
      : data.startsWith("did:") && data.split(" ").length === 1 ?
        <a class="underline" href={`/at/${data}`}>
          {data}
        </a>
      : (
        isURL(data) &&
        ["http:", "https:", "web+at:"].includes(new URL(data).protocol)
      ) ?
        <a
          class="underline"
          href={data}
          target="_blank"
          rel="noopener noreferer"
        >
          {data}
        </a>
      : data}
    </span>
  );
};

const JSONNumber = ({ data }: { data: number }) => {
  return <span class="text-[#f85552] dark:text-red-400">{data}</span>;
};

const JSONBoolean = ({ data }: { data: boolean }) => {
  return (
    <span class="text-[#f57d26] dark:text-orange-300">
      {data ? "true" : "false"}
    </span>
  );
};

const JSONNull = () => {
  return <span class="text-neutral-400 dark:text-neutral-500">null</span>;
};

const JSONObject = ({
  data,
  repo,
}: {
  data: { [x: string]: JSONType };
  repo: string;
}) => {
  const [clip, setClip] = createSignal(false);
  const rawObj = (
    <For each={Object.entries(data)}>
      {([key, value]) => (
        <span
          classList={{
            "flex gap-x-1": true,
            "flex-col": value === Object(value),
          }}
        >
          <span class="shrink-0 text-[#3a94c5] dark:text-cyan-500">
            <span
              classList={{
                "group/clip relative flex size-fit cursor-pointer items-center pl-4":
                  true,
                "pl-0": Array.isArray(value),
              }}
              onmouseleave={() => setClip(false)}
              onclick={() =>
                navigator.clipboard
                  .writeText(JSON.stringify(value).replace(/^"(.+)"$/, "$1"))
                  .then(() => setClip(true))
              }
            >
              <span class="absolute left-0 hidden text-[0.625rem] group-hover/clip:block">
                {clip() ?
                  <div class="i-bi-clipboard-check-fill" />
                : <div class="i-bi-clipboard" />}
              </span>
              {key}:
            </span>
          </span>
          <span classList={{ "ml-[2ch]": value === Object(value) }}>
            <JSONValue data={value} repo={repo} />
          </span>
        </span>
      )}
    </For>
  );

  const blob: AtBlob = data as any;

  if (blob.$type === "blob" && blob.mimeType.startsWith("image/")) {
    return (
      <>
        <a
          href={`https://cdn.bsky.app/img/feed_thumbnail/plain/${repo}/${blob.ref.$link}@jpeg`}
          target="_blank"
          class="contents"
        >
          <img
            class="max-h-[16rem] max-w-[16rem]"
            src={`https://cdn.bsky.app/img/feed_thumbnail/plain/${repo}/${blob.ref.$link}@jpeg`}
          />
        </a>
        {rawObj}
      </>
    );
  }

  if (blob.$type === "blob" && blob.mimeType === "video/mp4") {
    return (
      <>
        <VideoPlayer did={repo} cid={blob.ref.$link} />
        {rawObj}
      </>
    );
  }

  return rawObj;
};

const JSONArray = ({ data, repo }: { data: JSONType[]; repo: string }) => {
  return (
    <For each={data}>
      {(value, index) => (
        <span
          classList={{
            "flex before:content-['-']": true,
            "mb-2": value === Object(value) && index() !== data.length - 1,
          }}
        >
          <span classList={{ "ml-[1ch]": value !== Object(value) }}>
            <JSONValue data={value} repo={repo} />
          </span>
        </span>
      )}
    </For>
  );
};

export const JSONValue = ({ data, repo }: { data: JSONType; repo: string }) => {
  if (typeof data === "string") return <JSONString data={data} />;
  if (typeof data === "number") return <JSONNumber data={data} />;
  if (typeof data === "boolean") return <JSONBoolean data={data} />;
  if (data === null) return <JSONNull />;
  if (Array.isArray(data)) return <JSONArray data={data} repo={repo} />;
  return <JSONObject data={data} repo={repo} />;
};

export type JSONType =
  | string
  | number
  | boolean
  | null
  | { [x: string]: JSONType }
  | JSONType[];
