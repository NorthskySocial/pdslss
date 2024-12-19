import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import * as monaco from "monaco-editor";
import { onMount } from "solid-js";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new jsonWorker();
    return new editorWorker();
  },
};

const Editor = (props: { theme: string; model: monaco.editor.IModel }) => {
  let editorDiv!: HTMLDivElement;

  onMount(() => {
    monaco.editor.create(editorDiv, {
      minimap: { enabled: false },
      theme: props.theme === "dark" ? "vs-dark" : "vs",
      model: props.model,
      wordWrap: "on",
    });
  });

  return (
    <div ref={editorDiv} class="w-xs h-sm sm:w-xl sm:h-lg lg:w-[60rem]"></div>
  );
};

export { Editor };
