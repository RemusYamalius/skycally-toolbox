// src/server.ts
//
// Custom Cloudflare Workers entry point for the TanStack Start app.
//
// Static assets (/assets/*, logo.webp, etc.) are already cached correctly
// for a year via public/_headers. This file adds a short edge cache for the
// rendered HTML documents themselves, since none of the site's pages
// (calculators, tools, games) are personalized per visitor.
//
// IMPORTANT: real browser requests always carry some cookies (Cloudflare's
// own bot-management cookie, analytics, etc.), and Cloudflare attaches
// Set-Cookie to almost every response for the same reason. So instead of
// skipping the cache whenever a cookie is present (which disabled caching
// for ~100% of real traffic), we strip Set-Cookie from the copy we store in
// cache, while the actual visitor still gets their normal response with
// cookies intact. This keeps caching safe without disabling it entirely.

import handler from "@tanstack/react-start/server-entry";

const HTML_CACHE_TTL_SECONDS = 300; // 5 minutes

function isCacheableRequest(request: Request): boolean {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/assets/")
  ) {
    return false;
  }

  return true;
}

function isCacheableResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html");
}

export default {
  // @ts-expect-error — Cloudflare calls fetch(request, env, ctx), while
  // TanStack Start's typed ServerEntry interface only models fetch(request).
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const cache = typeof caches !== "undefined" ? (caches as any).default : null;
    const cacheable = cache !== null && isCacheableRequest(request);

    if (cacheable) {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    }

    const response = await handler.fetch(request, {
      context: { fromFetch: true },
    });

    if (cacheable && isCacheableResponse(response)) {
      // Build the version we STORE in cache: same body, but with Set-Cookie
      // stripped so we never leak one visitor's cookies to another via cache.
      const storedResponse = new Response(response.body, response);
      storedResponse.headers.delete("set-cookie");
      storedResponse.headers.set(
        "Cache-Control",
        `public, max-age=${HTML_CACHE_TTL_SECONDS}`,
      );

      if (ctx?.waitUntil) {
        ctx.waitUntil(cache.put(request, storedResponse.clone()));
      } else {
        await cache.put(request, storedResponse.clone());
      }

      // The CURRENT visitor still gets a normal response (their own
      // Set-Cookie intact) — only the cached copy has cookies stripped.
      return storedResponse;
    }

    return response;
  },
};
