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

const Editor = ({
  theme,
  model,
}: {
  theme: string;
  model: monaco.editor.IModel;
}) => {
  let editorDiv!: HTMLDivElement;

  onMount(() => {
    monaco.editor.create(editorDiv, {
      minimap: { enabled: false },
      theme: theme === "dark" ? "vs-dark" : "vs",
      model: model,
    });
  });

  return (
    <div ref={editorDiv} class="w-xs h-sm sm:w-xl sm:h-lg lg:w-[64rem]"></div>
  );
};

export { Editor };
