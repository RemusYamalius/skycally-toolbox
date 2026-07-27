// Attachment Style Test item bank.
//
// Two continuous dimensions, following the standard two-dimensional model of
// adult attachment: Attachment Anxiety (fear of abandonment, need for
// reassurance) and Attachment Avoidance (discomfort with closeness and
// dependence).
//
// All 28 statements below are original wording written for this tool. No
// items are copied or paraphrased from the ECR, ECR-R, the Relationship
// Questionnaire, or any other copyrighted instrument.
//
// Keying is balanced 7-positive / 7-negative per dimension so that
// acquiescence bias (the tendency to agree with statements regardless of
// content) cancels out in the dimension average. Reverse-keyed items are
// scored as (6 - response) before averaging.

export type Dimension = "anxiety" | "avoidance";
export type Keyed = "+" | "-";

export interface Item {
  id: number;
  text: string;
  dimension: Dimension;
  keyed: Keyed;
}

export const ITEMS: Item[] = [
  // ── Attachment Anxiety — 7 positively keyed ───────────────────────────────
  { id: 1, dimension: "anxiety", keyed: "+", text: "I worry that the people I'm close to will stop caring about me." },
  { id: 2, dimension: "anxiety", keyed: "+", text: "When someone I care about takes a while to reply, I start assuming something is wrong." },
  { id: 3, dimension: "anxiety", keyed: "+", text: "I need a lot of reassurance that I'm still wanted in a relationship." },
  { id: 4, dimension: "anxiety", keyed: "+", text: "I find myself replaying conversations, looking for signs that someone is pulling away." },
  { id: 5, dimension: "anxiety", keyed: "+", text: "I often want more closeness than the other person seems to want." },
  { id: 6, dimension: "anxiety", keyed: "+", text: "A small change in someone's tone can throw off my whole day." },
  { id: 7, dimension: "anxiety", keyed: "+", text: "I get anxious when someone close to me spends time apart from me." },

  // ── Attachment Anxiety — 7 reverse keyed ──────────────────────────────────
  { id: 8, dimension: "anxiety", keyed: "-", text: "I feel secure in my close relationships even when we go a while without talking." },
  { id: 9, dimension: "anxiety", keyed: "-", text: "I rarely worry about being left." },
  { id: 10, dimension: "anxiety", keyed: "-", text: "I can take a delayed reply at face value without reading into it." },
  { id: 11, dimension: "anxiety", keyed: "-", text: "I trust that the people close to me still care, even when they're distracted or busy." },
  { id: 12, dimension: "anxiety", keyed: "-", text: "I don't need frequent reassurance to feel settled in a relationship." },
  { id: 13, dimension: "anxiety", keyed: "-", text: "After a disagreement, I can usually assume things are still fine between us." },
  { id: 14, dimension: "anxiety", keyed: "-", text: "The amount of closeness I get from others usually feels like enough." },

  // ── Attachment Avoidance — 7 positively keyed ─────────────────────────────
  { id: 15, dimension: "avoidance", keyed: "+", text: "I'd rather handle a hard time on my own than lean on someone." },
  { id: 16, dimension: "avoidance", keyed: "+", text: "I get uncomfortable when a relationship starts feeling very close." },
  { id: 17, dimension: "avoidance", keyed: "+", text: "I keep parts of myself private even from the people closest to me." },
  { id: 18, dimension: "avoidance", keyed: "+", text: "Depending on other people makes me uneasy." },
  { id: 19, dimension: "avoidance", keyed: "+", text: "When someone wants to talk about feelings, I tend to change the subject." },
  { id: 20, dimension: "avoidance", keyed: "+", text: "I need a lot of space and time alone, even in relationships that are going well." },
  { id: 21, dimension: "avoidance", keyed: "+", text: "When things get tense with someone, my instinct is to withdraw." },

  // ── Attachment Avoidance — 7 reverse keyed ────────────────────────────────
  { id: 22, dimension: "avoidance", keyed: "-", text: "It feels natural to turn to someone close when I'm struggling." },
  { id: 23, dimension: "avoidance", keyed: "-", text: "I'm comfortable being emotionally open with people I trust." },
  { id: 24, dimension: "avoidance", keyed: "-", text: "I like being depended on, and depending on others in return." },
  { id: 25, dimension: "avoidance", keyed: "-", text: "Getting very close to someone feels good rather than suffocating." },
  { id: 26, dimension: "avoidance", keyed: "-", text: "I can talk about what I'm feeling without shutting down." },
  { id: 27, dimension: "avoidance", keyed: "-", text: "When there's tension, I'd rather stay and work it out than pull back." },
  { id: 28, dimension: "avoidance", keyed: "-", text: "I find it easy to ask for help when I need it." },
];

// ── Verification (build-time sanity check) ───────────────────────────────────
// Exactly 14 items per dimension, 7 positive and 7 negative each. Any future
// edit that breaks the balance surfaces here instead of silently skewing the
// dimension averages.
{
  const counts: Record<Dimension, { "+": number; "-": number }> = {
    anxiety: { "+": 0, "-": 0 },
    avoidance: { "+": 0, "-": 0 },
  };
  for (const it of ITEMS) counts[it.dimension][it.keyed]++;
  for (const d of ["anxiety", "avoidance"] as Dimension[]) {
    const total = counts[d]["+"] + counts[d]["-"];
    if (total !== 14) {
      // eslint-disable-next-line no-console
      console.warn(`[attachment] dimension ${d} has ${total} items, expected 14`, counts[d]);
    }
    if (counts[d]["+"] !== 7 || counts[d]["-"] !== 7) {
      // eslint-disable-next-line no-console
      console.warn(`[attachment] dimension ${d} keying imbalance (expected 7/7)`, counts[d]);
    }
  }
  const ids = new Set(ITEMS.map((i) => i.id));
  if (ids.size !== ITEMS.length) {
    // eslint-disable-next-line no-console
    console.warn("[attachment] duplicate item ids");
  }
}

export const ITEM_COUNT = ITEMS.length;
