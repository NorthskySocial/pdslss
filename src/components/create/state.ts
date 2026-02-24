import { type EditorView } from "codemirror";
import { createSignal } from "solid-js";

export const editorInstance: { view: EditorView | null } = { view: null };
export const [placeholder, setPlaceholder] = createSignal<unknown>();
