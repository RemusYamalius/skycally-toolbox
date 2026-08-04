/**
 * Call this whenever an in-page state transition changes what the user
 * sees (e.g. moving from a setup screen to results, or between steps of a
 * wizard-style tool) WITHOUT a real route navigation. TanStack Router's
 * scrollRestoration only fires on actual navigation — it does nothing for
 * internal component state changes, so multi-step tools must scroll
 * themselves or the user can be left looking at whatever section of the
 * page they'd scrolled to before triggering the transition.
 */
export function scrollToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
