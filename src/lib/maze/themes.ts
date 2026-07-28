// Emoji start/end pairs for the maze. A shuffled copy is walked in order so
// the same pair never appears twice in a row and the whole set cycles before
// anything repeats (same principle as Never Have I Ever's shuffle).

export interface ThemePair {
  start: string;
  end: string;
  label: string;
}

export const THEME_PAIRS: ThemePair[] = [
  { start: "🐵", end: "🍌", label: "Monkey & Banana" },
  { start: "🐭", end: "🧀", label: "Mouse & Cheese" },
  { start: "🐝", end: "🌻", label: "Bee & Sunflower" },
  { start: "🐛", end: "🦋", label: "Caterpillar & Butterfly" },
  { start: "🐶", end: "🦴", label: "Dog & Bone" },
  { start: "🐢", end: "🥬", label: "Turtle & Lettuce" },
  { start: "🐟", end: "🐚", label: "Fish & Shell" },
  { start: "🐔", end: "🌽", label: "Chicken & Corn" },
  { start: "🐻", end: "🍯", label: "Bear & Honey" },
  { start: "🐰", end: "🥕", label: "Rabbit & Carrot" },
  { start: "🚗", end: "🏁", label: "Car & Finish Line" },
  { start: "🚀", end: "🪐", label: "Rocket & Planet" },
  { start: "⛵", end: "🏝️", label: "Sailboat & Island" },
  { start: "🧑‍🚀", end: "🌕", label: "Astronaut & Moon" },
  { start: "⚽", end: "🥅", label: "Ball & Goal" },
  { start: "🐧", end: "🐟", label: "Penguin & Fish" },
  { start: "👻", end: "🍬", label: "Ghost & Candy" },
  { start: "🎃", end: "🕯️", label: "Pumpkin & Candle" },
  { start: "🐦", end: "🪺", label: "Bird & Nest" },
  { start: "🐜", end: "🧁", label: "Ant & Cupcake" },
  { start: "🦆", end: "🌾", label: "Duck & Wheat" },
  { start: "🐴", end: "🌾", label: "Horse & Hay" },
  { start: "🐨", end: "🌿", label: "Koala & Eucalyptus" },
  { start: "🦁", end: "👑", label: "Lion & Crown" },
];

/** Fisher-Yates shuffle over a copy of the pairs. */
export function shuffledThemes(): ThemePair[] {
  const out = [...THEME_PAIRS];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Walks a shuffled deck, reshuffling once every pair has been used. */
export function createThemeCycler() {
  let deck = shuffledThemes();
  let i = 0;
  return {
    next(): ThemePair {
      if (i >= deck.length) {
        const last = deck[deck.length - 1];
        deck = shuffledThemes();
        // Avoid an immediate repeat across the deck boundary.
        if (deck[0].label === last.label) [deck[0], deck[1]] = [deck[1], deck[0]];
        i = 0;
      }
      return deck[i++];
    },
  };
}
