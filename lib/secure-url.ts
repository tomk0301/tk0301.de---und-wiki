import { headers } from "next/headers";

export async function secureUrl(path: string) {
  const requestHeaders = await headers();
  const requestedHost =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const allowedHosts = new Set([
    "tk0301.site",
    "www.tk0301.site",
    "wiki.tk0301.site",
  ]);
  const host = allowedHosts.has(requestedHost) ? requestedHost : "tk0301.site";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}${path}`;
}
