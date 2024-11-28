import { A } from "@solidjs/router";
import VideoPlayer from "./video-player";
import { BsClipboard, BsClipboardCheck } from "./svg";
import { createSignal } from "solid-js";

interface AtBlob {
  $type: string;
  ref: { $link: string };
  mimeType: string;
}

const JSONString = ({ data }: { data: string }) => {
  return (
    <span class="text-emerald-600 dark:text-emerald-400">
      {data.startsWith("at://") && data.split(" ").length === 1 ?
        <A class="underline" href={data.replace("at://", "/at/")}>
          {data}
        </A>
      : data.startsWith("did:") ?
        <A class="underline" href={`/at/${data}`}>
          {data}
        </A>
      : URL.canParse(data) ?
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
  return <span class="text-red-600 dark:text-red-500">{data}</span>;
};

const JSONBoolean = ({ data }: { data: boolean }) => {
  return <span class="text-blue-500">{data ? "true" : "false"}</span>;
};

const JSONNull = () => {
  return <span class="text-gray-600 dark:text-gray-400">null</span>;
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
    <>
      {Object.entries(data).map(([key, value]) => (
        <span
          classList={{
            "flex gap-x-1": true,
            "flex-col": value === Object(value),
          }}
        >
          <span class="shrink-0 text-amber-600 dark:text-amber-400">
            <span
              class="group relative flex size-fit cursor-pointer items-center"
              onmouseleave={() => setClip(false)}
              onclick={() =>
                navigator.clipboard
                  .writeText(JSON.stringify(value).replace(/^"(.+)"$/, "$1"))
                  .then(() => setClip(true))
              }
            >
              <span class="absolute -left-4 size-3">
                {clip() ?
                  <BsClipboardCheck class="hidden size-3 group-hover:block" />
                : <BsClipboard class="hidden size-3 group-hover:block" />}
              </span>
              {key}:
            </span>
          </span>
          <span classList={{ "ml-4 sm:ml-5": value === Object(value) }}>
            <JSONValue data={value} repo={repo} />
          </span>
        </span>
      ))}
    </>
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
    <ul style="list-style-type: '- '">
      {data.map((value, index) => (
        <li
          classList={{
            "mb-3": value === Object(value) && index != data.length - 1,
          }}
        >
          <JSONValue data={value} repo={repo} />
        </li>
      ))}
    </ul>
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
