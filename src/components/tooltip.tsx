const Tooltip = (props: { text: string }) => {
  const width = props.text.length;
  return (
    <span
      style={`transform: translate(-50%, 2rem)`}
      class={`z-5 left-50% invisible absolute whitespace-nowrap dark:bg-neutral-800 min-w-[${width.toString()}ch] rounded border border-neutral-500 bg-white p-1 text-center text-xs group-hover/tooltip:visible`}
    >
      {props.text}
    </span>
  );
};

export default Tooltip;
