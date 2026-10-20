import { Did } from "@atcute/lexicons";
import {
  buildCollectionScope,
  buildRpcScope,
  STRATOS_SCOPES,
} from "@northskysocial/stratos-client";

import { agent, sessions } from "./state";

export const SPACE_READ_SCOPE_ID = "space-read" as const;
export const SPACE_READ_SCOPE = "space:*?authority=*&action=read";

export const GRANULAR_SCOPES = [
  {
    id: "create",
    scope: "repo:*?action=create",
    label: "Create records",
  },
  {
    id: "update",
    scope: "repo:*?action=update",
    label: "Update records",
  },
  {
    id: "delete",
    scope: "repo:*?action=delete",
    label: "Delete records",
  },
  {
    id: "blob",
    scope: "blob:*/*",
    label: "Upload blobs",
  },
  {
    id: SPACE_READ_SCOPE_ID,
    scope: SPACE_READ_SCOPE,
    label: "Read Space records (alpha)",
  },
  {
    id: "stratos-enrollment",
    scope: buildCollectionScope(STRATOS_SCOPES.enrollment),
    label: "Stratos enrollment",
  },
  {
    id: "stratos-posts",
    scope: buildCollectionScope(STRATOS_SCOPES.post, ["create", "delete"]),
    label: "Stratos posts",
  },
  {
    id: "stratos-feed",
    scope: buildRpcScope(STRATOS_SCOPES.getFeed),
    label: "Stratos feeds",
  },
] as const;

export type ScopeId = (typeof GRANULAR_SCOPES)[number]["id"];

/** scope ids that require the Stratos enrollment scope to be useful */
export const STRATOS_DEPENDENT_SCOPES = ["stratos-posts", "stratos-feed"];

export const BASE_SCOPES = ["atproto"];

export const buildScopeString = (selected: Set<string>): string => {
  const granular = GRANULAR_SCOPES.filter((s) => selected.has(s.id)).map((s) => s.scope);
  return [...BASE_SCOPES, ...granular].join(" ");
};

export const scopeIdsToString = (scopeIds: Set<string>): string => {
  return ["atproto", ...Array.from(scopeIds)].join(",");
};

export const parseScopeString = (scopeIdsString: string): Set<string> => {
  if (!scopeIdsString) return new Set();
  const ids = scopeIdsString.split(",").filter(Boolean);
  return new Set(ids.filter((id) => id !== "atproto"));
};

export const oauthScopeStringToIds = (scopeString: string): Set<string> => {
  const granted = new Set(scopeString.split(" ").filter(Boolean));
  return new Set(GRANULAR_SCOPES.filter(({ scope }) => granted.has(scope)).map(({ id }) => id));
};

const hasScope = (grantedScopes: string | undefined, scopeId: string): boolean => {
  if (!grantedScopes) return false;
  return grantedScopes.split(",").includes(scopeId);
};

export const hasUserScope = (scopeId: ScopeId): boolean => {
  const currentAgent = agent();
  if (!currentAgent) return false;

  return hasAccountScope(currentAgent.sub, scopeId);
};

export const hasAccountScope = (did: Did, scopeId: ScopeId): boolean => {
  const currentAgent = agent();

  const configuredScope = GRANULAR_SCOPES.find(({ id }) => id === scopeId)?.scope;
  if (currentAgent?.sub === did && configuredScope && currentAgent.session.token.scope) {
    return currentAgent.session.token.scope.split(" ").includes(configuredScope);
  }

  const grantedScopes = sessions[did]?.grantedScopes;
  if (!grantedScopes) return true;
  return hasScope(grantedScopes, scopeId);
};
