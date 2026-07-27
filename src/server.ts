// src/server.ts
//
// SAFE FALLBACK — no custom caching logic whatsoever.
// This restores the default TanStack Start behavior exactly, to stop the
// live 500 errors immediately while we diagnose the caching code offline.

import handler from "@tanstack/react-start/server-entry";

export default {
  fetch(request: Request) {
    return handler.fetch(request);
  },
};

