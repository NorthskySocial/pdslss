import { createSignal } from "solid-js";

export const [copyNotice, setCopyNotice] = createSignal(false);

let timeout: number;

export const addToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  setCopyNotice(true);
  clearTimeout(timeout);
  timeout = setTimeout(() => setCopyNotice(false), 3000);
};
