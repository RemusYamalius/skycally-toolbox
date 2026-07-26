// src/server.ts
//
// Custom Cloudflare Workers entry point for the TanStack Start app.
//
// WHY THIS FILE EXISTS
// By default, wrangler.jsonc points "main" straight at
// "@tanstack/react-start/server-entry", which means every single visitor
// request re-runs full server-side rendering from scratch. Static assets
// (/assets/*, logo.webp, etc.) are already cached correctly for a year via
// public/_headers — but the HTML document itself was never cached, which is
// exactly what PageSpeed Insights' TTFB metric measures.
//
// This file wraps the default handler with Cloudflare's Cache API so that
// identical pages (calculators, tools, games — none of which are
// personalized per visitor) are served instantly from the edge cache
// instead of being rebuilt on every request.
//
// After adding this file, update wrangler.jsonc:
//   "main": "./src/server.ts"
// (instead of "@tanstack/react-start/server-entry")

import handler from "@tanstack/react-start/server-entry";

// How long a rendered HTML page stays in Cloudflare's edge cache.
// Keep this modest: long enough to remove most TTFB hits, short enough that
// content updates (new tools, copy edits) show up again quickly.
const HTML_CACHE_TTL_SECONDS = 300; // 5 minutes

function isCacheableRequest(request: Request): boolean {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);

  // Never cache server functions / RPC calls, or static assets
  // (assets already have their own long-lived cache via public/_headers).
  if (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/assets/")
  ) {
    return false;
  }

  // Safety net: if personalization (login, per-user data) is ever added
  // later, requests carrying a cookie will skip the cache automatically.
  // Today the app sets no session cookies, so this rarely triggers.
  if (request.headers.has("cookie")) return false;

  return true;
}

function isCacheableResponse(response: Response): boolean {
  if (response.status !== 200) return false;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return false;

  // Don't cache anything that tries to set a cookie on the visitor.
  if (response.headers.has("set-cookie")) return false;

  return true;
}

export default {
  // @ts-expect-error — Cloudflare calls fetch(request, env, ctx), while
  // TanStack Start's typed ServerEntry interface only models fetch(request).
  // The mismatch is cosmetic and doesn't affect runtime behavior.
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const cache = caches.default;
    const cacheable = isCacheableRequest(request);

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
      const cacheableResponse = new Response(response.body, response);
      cacheableResponse.headers.set(
        "Cache-Control",
        `public, max-age=${HTML_CACHE_TTL_SECONDS}`,
      );

      // Store in the background so the visitor doesn't wait on the cache write.
      ctx.waitUntil(cache.put(request, cacheableResponse.clone()));

      return cacheableResponse;
    }

    return response;
  },
};
