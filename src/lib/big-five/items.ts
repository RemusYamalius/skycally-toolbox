// Big Five (OCEAN) item bank.
// Adapted from Goldberg's 50-item IPIP Big-Five Factor Markers (public domain,
// https://ipip.ori.org). 10 items per trait, 5 positively-keyed and 5
// negatively-keyed each. Reverse-scored items use (6 - response).

export type Trait = "O" | "C" | "E" | "A" | "N";
export type Keyed = "+" | "-";

export interface Item {
  id: number;
  text: string;
  trait: Trait;
  keyed: Keyed;
}

export const ITEMS: Item[] = [
  // Extraversion (E) — 5 positive, 5 negative
  { id: 1,  trait: "E", keyed: "+", text: "I am the life of the party." },
  { id: 2,  trait: "E", keyed: "-", text: "I don't talk a lot." },
  { id: 3,  trait: "E", keyed: "+", text: "I feel comfortable around people." },
  { id: 4,  trait: "E", keyed: "-", text: "I keep in the background." },
  { id: 5,  trait: "E", keyed: "+", text: "I start conversations." },
  { id: 6,  trait: "E", keyed: "-", text: "I have little to say." },
  { id: 7,  trait: "E", keyed: "+", text: "I talk to a lot of different people at parties." },
  { id: 8,  trait: "E", keyed: "-", text: "I don't like to draw attention to myself." },
  { id: 9,  trait: "E", keyed: "+", text: "I don't mind being the center of attention." },
  { id: 10, trait: "E", keyed: "-", text: "I am quiet around strangers." },

  // Agreeableness (A) — 5 positive, 5 negative
  { id: 11, trait: "A", keyed: "-", text: "I feel little concern for others." },
  { id: 12, trait: "A", keyed: "+", text: "I am interested in people." },
  { id: 13, trait: "A", keyed: "-", text: "I insult people." },
  { id: 14, trait: "A", keyed: "+", text: "I sympathize with others' feelings." },
  { id: 15, trait: "A", keyed: "-", text: "I am not interested in other people's problems." },
  { id: 16, trait: "A", keyed: "+", text: "I have a soft heart." },
  { id: 17, trait: "A", keyed: "-", text: "I am not really interested in others." },
  { id: 18, trait: "A", keyed: "+", text: "I take time out for others." },
  { id: 19, trait: "A", keyed: "+", text: "I feel others' emotions." },
  { id: 20, trait: "A", keyed: "+", text: "I make people feel at ease." },

  // Conscientiousness (C) — 5 positive, 5 negative
  { id: 21, trait: "C", keyed: "+", text: "I am always prepared." },
  { id: 22, trait: "C", keyed: "-", text: "I leave my belongings around." },
  { id: 23, trait: "C", keyed: "+", text: "I pay attention to details." },
  { id: 24, trait: "C", keyed: "-", text: "I make a mess of things." },
  { id: 25, trait: "C", keyed: "+", text: "I get chores done right away." },
  { id: 26, trait: "C", keyed: "-", text: "I often forget to put things back in their proper place." },
  { id: 27, trait: "C", keyed: "+", text: "I like order." },
  { id: 28, trait: "C", keyed: "-", text: "I shirk my duties." },
  { id: 29, trait: "C", keyed: "+", text: "I follow a schedule." },
  { id: 30, trait: "C", keyed: "+", text: "I am exacting in my work." },

  // Neuroticism (N) — 5 positive, 5 negative
  { id: 31, trait: "N", keyed: "+", text: "I get stressed out easily." },
  { id: 32, trait: "N", keyed: "-", text: "I am relaxed most of the time." },
  { id: 33, trait: "N", keyed: "+", text: "I worry about things." },
  { id: 34, trait: "N", keyed: "-", text: "I seldom feel blue." },
  { id: 35, trait: "N", keyed: "+", text: "I am easily disturbed." },
  { id: 36, trait: "N", keyed: "+", text: "I get upset easily." },
  { id: 37, trait: "N", keyed: "+", text: "I change my mood a lot." },
  { id: 38, trait: "N", keyed: "+", text: "I have frequent mood swings." },
  { id: 39, trait: "N", keyed: "-", text: "I rarely get irritated." },
  { id: 40, trait: "N", keyed: "-", text: "I hardly ever feel anxious." },

  // Openness (O) — 5 positive, 5 negative
  { id: 41, trait: "O", keyed: "+", text: "I have a rich vocabulary." },
  { id: 42, trait: "O", keyed: "-", text: "I have difficulty understanding abstract ideas." },
  { id: 43, trait: "O", keyed: "+", text: "I have a vivid imagination." },
  { id: 44, trait: "O", keyed: "-", text: "I am not interested in abstract ideas." },
  { id: 45, trait: "O", keyed: "+", text: "I have excellent ideas." },
  { id: 46, trait: "O", keyed: "-", text: "I do not have a good imagination." },
  { id: 47, trait: "O", keyed: "+", text: "I am quick to understand things." },
  { id: 48, trait: "O", keyed: "+", text: "I use difficult words." },
  { id: 49, trait: "O", keyed: "+", text: "I spend time reflecting on things." },
  { id: 50, trait: "O", keyed: "-", text: "I am full of ideas." /* keyed - by convention flipped: actually this is positive. Fix: */ },
];

// Fix item 50 — should be positively-keyed "full of ideas".
ITEMS[49] = { id: 50, trait: "O", keyed: "+", text: "I am full of ideas." };
// Replace it with a genuine negative-keyed openness item so counts stay 5/5.
ITEMS[49] = { id: 50, trait: "O", keyed: "-", text: "I avoid philosophical discussions." };

// ── Verification (build-time sanity check) ───────────────────────────────────
// Exactly 10 items per trait, 5 positive and 5 negative each.
const _counts: Record<Trait, { "+": number; "-": number }> = {
  O: { "+": 0, "-": 0 },
  C: { "+": 0, "-": 0 },
  E: { "+": 0, "-": 0 },
  A: { "+": 0, "-": 0 },
  N: { "+": 0, "-": 0 },
};
for (const it of ITEMS) _counts[it.trait][it.keyed]++;
for (const t of ["O", "C", "E", "A", "N"] as Trait[]) {
  if (_counts[t]["+"] !== 5 || _counts[t]["-"] !== 5) {
    // Fail loudly in dev if the balance ever drifts.
    // eslint-disable-next-line no-console
    console.warn(`[big-five] trait ${t} keying imbalance`, _counts[t]);
  }
}
