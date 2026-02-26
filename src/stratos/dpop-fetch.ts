import type { FetchHandlerObject } from "@atcute/client";
import type { OAuthUserAgent } from "@atcute/oauth-browser-client";

/**
 * creates a fetch handler that targets a specific service URL using
 * the DPoP credentials from an existing OAuthUserAgent session.
 *
 * OAuthUserAgent.handle() resolves relative pathnames against session.info.aud
 * (the user's PDS). by passing an absolute URL instead, the base is ignored per
 * the URL spec, so the request goes to our target service. the underlying DPoP
 * fetch derives htu from the actual request URL, so proofs are valid for any origin.
 *
 * @param agent the authenticated OAuthUserAgent (provides DPoP key + access token)
 * @param serviceUrl the target service base URL (e.g. "https://stratos.example.com")
 * @returns a FetchHandlerObject that routes XRPC calls to the target service
 */
export const createServiceFetchHandler = (
  agent: OAuthUserAgent,
  serviceUrl: string,
): FetchHandlerObject => {
  return {
    async handle(pathname: string, init?: RequestInit): Promise<Response> {
      const url = new URL(pathname, serviceUrl);
      const headers = new Headers(init?.headers);
      // ngrok free tier returns an HTML interstitial for browser User-Agents
      headers.set("ngrok-skip-browser-warning", "1");
      return agent.handle(url.href, { ...init, headers });
    },
  };
};
