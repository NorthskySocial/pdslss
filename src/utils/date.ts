const localDateFromTimestamp = (timestamp: number) =>
  new Date(timestamp - new Date().getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .split(".")[0]
    .replace("T", " ");

export { localDateFromTimestamp };
