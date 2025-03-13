export const ADDRESSED_ATURI_RE =
  /^at:\/\/(did:[a-z]+:[a-zA-Z0-9._:%\-]*[a-zA-Z0-9._\-]|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])\/([a-zA-Z0-9-.]+)\/((?!\.{1,2}$)[a-zA-Z0-9_~.:-]{1,512})(?:#(\/[a-zA-Z0-9._~:@!$&%')(*+,;=\-[\]/\\]*))?$/;

export interface AddressedAtUri {
  repo: string;
  collection: string;
  rkey: string;
  fragment: string | undefined;
}

export const parseAddressedAtUri = (str: string): AddressedAtUri => {
  const match = ADDRESSED_ATURI_RE.exec(str);
  if (match === null) {
    throw new Error(`failed to parse at-uri for ${str}`);
  }

  return {
    repo: match[1],
    collection: match[2],
    rkey: match[3],
    fragment: match[4],
  };
};
