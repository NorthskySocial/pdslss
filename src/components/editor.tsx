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

const Editor = (props: {
  theme: string;
  model: monaco.editor.IModel;
  readOnly?: boolean;
}) => {
  let editorDiv!: HTMLDivElement;

  onMount(() => {
    monaco.editor.create(editorDiv, {
      minimap: { enabled: false },
      theme: props.theme === "dark" ? "vs-dark" : "vs",
      model: props.model,
      readOnly: props.readOnly ?? false,
      lineNumbers: props.readOnly ? "off" : "on",
      wordWrap: "on",
      automaticLayout: true,
      scrollBeyondLastLine: !props.readOnly,
    });
  });

  return (
    <div
      ref={editorDiv}
      classList={{
        "w-xs sm:w-xl": true,
        "h-sm sm:h-lg lg:w-[60rem]": !props.readOnly,
        "h-[42rem] lg:w-[50rem]": props.readOnly,
      }}
    ></div>
  );
};

export { Editor };
