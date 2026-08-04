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

  // A stage change can remove thousands of pixels above the current viewport.
  // Mobile browsers then apply scroll anchoring after React commits and undo a
  // scroll issued by the click handler. Disable anchoring briefly and repeat
  // the same smooth scroll after the new DOM has settled.
  const root = document.documentElement;
  const body = document.body;
  const previousRootAnchor = root.style.overflowAnchor;
  const previousBodyAnchor = body.style.overflowAnchor;
  root.style.overflowAnchor = "none";
  body.style.overflowAnchor = "none";

  const scroll = () => window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  scroll();

  let secondFrame = 0;
  const firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(scroll);
  });
  const settledTimer = window.setTimeout(scroll, 180);
  const cleanupTimer = window.setTimeout(() => {
    root.style.overflowAnchor = previousRootAnchor;
    body.style.overflowAnchor = previousBodyAnchor;
  }, 700);

  return () => {
    window.cancelAnimationFrame(firstFrame);
    if (secondFrame) window.cancelAnimationFrame(secondFrame);
    window.clearTimeout(settledTimer);
    window.clearTimeout(cleanupTimer);
    root.style.overflowAnchor = previousRootAnchor;
    body.style.overflowAnchor = previousBodyAnchor;
  };
}
