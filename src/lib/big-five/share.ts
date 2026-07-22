import type { Scores } from "./scoring";
import { TRAIT_ORDER, TRAIT_META } from "./scoring";

export function buildShareText(scores: Scores, url: string): string {
  const line = TRAIT_ORDER.map((t) => `${TRAIT_META[t].short.slice(0, 1)} ${scores[t].score0to100}`).join(" · ");
  const bands = TRAIT_ORDER.map((t) => `${TRAIT_META[t].short}: ${scores[t].band}`).join("\n");
  return `Big Five Personality — Skycally\n${line}\n\n${bands}\n\n${url}`;
}
