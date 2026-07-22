// Fancy text style transformations — all Unicode-based, no fonts/images.
// Every style falls back to the original character when no mapping exists.

export type StyleCategory =
  | "Bold & Italic"
  | "Cursive & Script"
  | "Bubble & Circled"
  | "Gothic & Fancy"
  | "Upside-Down & Mirrored"
  | "Small & Tiny"
  | "Symbols & Decorative";

export interface FancyStyle {
  id: string;
  name: string;
  category: StyleCategory;
  transform: (input: string) => string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const A = "A".charCodeAt(0);
const Z = "Z".charCodeAt(0);
const a = "a".charCodeAt(0);
const z = "z".charCodeAt(0);
const ZERO = "0".charCodeAt(0);
const NINE = "9".charCodeAt(0);

/**
 * Build a mapper from three code-point base offsets for A, a, 0.
 * `holes` overrides specific letters (used for Mathematical Alphanumeric
 * Symbols where certain letters live at legacy Letterlike Symbols code points).
 */
function makeRangeStyle(opts: {
  upperBase?: number;
  lowerBase?: number;
  digitBase?: number;
  holes?: Record<string, string>;
}) {
  const { upperBase, lowerBase, digitBase, holes = {} } = opts;
  return (input: string) => {
    let out = "";
    for (const ch of input) {
      if (holes[ch]) {
        out += holes[ch];
        continue;
      }
      const code = ch.codePointAt(0)!;
      if (upperBase != null && code >= A && code <= Z) {
        out += String.fromCodePoint(upperBase + (code - A));
      } else if (lowerBase != null && code >= a && code <= z) {
        out += String.fromCodePoint(lowerBase + (code - a));
      } else if (digitBase != null && code >= ZERO && code <= NINE) {
        out += String.fromCodePoint(digitBase + (code - ZERO));
      } else {
        out += ch;
      }
    }
    return out;
  };
}

/** Build a mapper from an explicit table. Untouched chars pass through. */
function makeTableStyle(table: Record<string, string>) {
  return (input: string) => {
    let out = "";
    for (const ch of input) out += table[ch] ?? ch;
    return out;
  };
}

/** Insert a combining mark after every non-space character. */
function combining(mark: string) {
  return (input: string) => {
    let out = "";
    for (const ch of input) out += ch === " " ? " " : ch + mark;
    return out;
  };
}

// ── Mathematical Alphanumeric holes (Unicode reserves some code points and
// reuses Letterlike Symbols instead). Reference: Unicode 15 chapter 22.4.
const SCRIPT_HOLES: Record<string, string> = {
  B: "\u212C",
  E: "\u2130",
  F: "\u2131",
  H: "\u210B",
  I: "\u2110",
  L: "\u2112",
  M: "\u2133",
  R: "\u211B",
  e: "\u212F",
  g: "\u210A",
  o: "\u2134",
};

const FRAKTUR_HOLES: Record<string, string> = {
  C: "\u212D",
  H: "\u210C",
  I: "\u2111",
  R: "\u211C",
  Z: "\u2128",
};

const DOUBLESTRUCK_HOLES: Record<string, string> = {
  C: "\u2102",
  H: "\u210D",
  N: "\u2115",
  P: "\u2119",
  Q: "\u211A",
  R: "\u211D",
  Z: "\u2124",
};

const ITALIC_HOLES: Record<string, string> = { h: "\u210E" };

// ── Small caps (IPA), Superscript, Subscript, Upside-down ────────────────────

const SMALL_CAPS: Record<string, string> = {
  a: "ᴀ",
  b: "ʙ",
  c: "ᴄ",
  d: "ᴅ",
  e: "ᴇ",
  f: "ꜰ",
  g: "ɢ",
  h: "ʜ",
  i: "ɪ",
  j: "ᴊ",
  k: "ᴋ",
  l: "ʟ",
  m: "ᴍ",
  n: "ɴ",
  o: "ᴏ",
  p: "ᴘ",
  q: "ǫ",
  r: "ʀ",
  s: "s",
  t: "ᴛ",
  u: "ᴜ",
  v: "ᴠ",
  w: "ᴡ",
  x: "x",
  y: "ʏ",
  z: "ᴢ",
};

const SUPERSCRIPT: Record<string, string> = {
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  // No superscript Latin letter exists for "q" in Unicode (same gap as the
  // uppercase "Q" below) — fall back to the plain character rather than an
  // unrelated glyph. (Previously mapped to "۹", an Arabic-Indic digit nine,
  // which is a clear bug: it would silently render a foreign digit in the
  // middle of a styled word instead of the letter q.)
  q: "q",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
  A: "ᴬ",
  B: "ᴮ",
  C: "ᶜ",
  D: "ᴰ",
  E: "ᴱ",
  F: "ᶠ",
  G: "ᴳ",
  H: "ᴴ",
  I: "ᴵ",
  J: "ᴶ",
  K: "ᴷ",
  L: "ᴸ",
  M: "ᴹ",
  N: "ᴺ",
  O: "ᴼ",
  P: "ᴾ",
  Q: "Q",
  R: "ᴿ",
  S: "ˢ",
  T: "ᵀ",
  U: "ᵁ",
  V: "ⱽ",
  W: "ᵂ",
  X: "ˣ",
  Y: "ʸ",
  Z: "ᶻ",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
};

const SUBSCRIPT: Record<string, string> = {
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
};

// Upside-down: individual letters get their inverted Unicode/IPA equivalents,
// then the string as a whole is reversed. Every ASCII letter/digit is mapped.
const UPSIDE_DOWN: Record<string, string> = {
  a: "ɐ",
  b: "q",
  c: "ɔ",
  d: "p",
  e: "ǝ",
  f: "ɟ",
  g: "ƃ",
  h: "ɥ",
  i: "ᴉ",
  j: "ɾ",
  k: "ʞ",
  l: "ʃ",
  m: "ɯ",
  n: "u",
  o: "o",
  p: "d",
  q: "b",
  r: "ɹ",
  s: "s",
  t: "ʇ",
  u: "n",
  v: "ʌ",
  w: "ʍ",
  x: "x",
  y: "ʎ",
  z: "z",
  A: "∀",
  B: "ꓭ",
  C: "Ɔ",
  D: "ꓷ",
  E: "Ǝ",
  F: "Ⅎ",
  G: "⅁",
  H: "H",
  I: "I",
  J: "ſ",
  K: "ꓘ",
  L: "˥",
  M: "W",
  N: "N",
  O: "O",
  P: "Ԁ",
  Q: "Ò",
  R: "ꓤ",
  S: "S",
  T: "⊥",
  U: "∩",
  V: "Λ",
  W: "M",
  X: "X",
  Y: "⅄",
  Z: "Z",
  "0": "0",
  "1": "Ɩ",
  "2": "ᄅ",
  "3": "Ɛ",
  "4": "ㄣ",
  "5": "ϛ",
  "6": "9",
  "7": "ㄥ",
  "8": "8",
  "9": "6",
  ".": "˙",
  ",": "'",
  "'": ",",
  '"': ",,",
  "!": "¡",
  "?": "¿",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "&": "⅋",
  _: "‾",
};

const MIRRORED: Record<string, string> = {
  a: "ɒ",
  b: "d",
  c: "ɔ",
  d: "b",
  e: "ɘ",
  f: "ʇ",
  g: "ǫ",
  h: "ʜ",
  i: "i",
  j: "ꞁ",
  k: "ʞ",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "q",
  q: "p",
  r: "ɿ",
  s: "ƨ",
  t: "ƚ",
  u: "u",
  v: "v",
  w: "w",
  x: "x",
  y: "y",
  z: "z",
  A: "A",
  B: "ꓭ",
  C: "Ɔ",
  D: "ꓷ",
  E: "Ǝ",
  F: "ꟻ",
  G: "Ꭾ",
  H: "H",
  I: "I",
  J: "Ⴑ",
  K: "ꓘ",
  L: "⅃",
  M: "M",
  N: "И",
  O: "O",
  P: "ꟼ",
  Q: "Ọ",
  R: "Я",
  S: "Ƨ",
  T: "T",
  U: "U",
  V: "V",
  W: "W",
  X: "X",
  Y: "Y",
  Z: "Ƹ",
  "1": "1",
  "2": "S",
  "3": "Ɛ",
  "4": "μ",
  "5": "2",
  "6": "მ",
  "7": "V",
  "8": "8",
  "9": "9",
  "0": "0",
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "?": "⸮",
};

// ── Style definitions ────────────────────────────────────────────────────────

export const STYLES: FancyStyle[] = [
  // ─── Bold & Italic (Mathematical Alphanumeric Symbols) ────────────────────
  {
    id: "bold",
    name: "𝐁𝐨𝐥𝐝",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d400, lowerBase: 0x1d41a, digitBase: 0x1d7ce }),
  },
  {
    id: "italic",
    name: "𝐼𝑡𝑎𝑙𝑖𝑐",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d434, lowerBase: 0x1d44e, holes: ITALIC_HOLES }),
  },
  {
    id: "bold-italic",
    name: "𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d468, lowerBase: 0x1d482 }),
  },
  {
    id: "sans-serif",
    name: "𝖲𝖺𝗇𝗌 𝖲𝖾𝗋𝗂𝖿",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d5a0, lowerBase: 0x1d5ba, digitBase: 0x1d7e2 }),
  },
  {
    id: "sans-bold",
    name: "𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d5d4, lowerBase: 0x1d5ee, digitBase: 0x1d7ec }),
  },
  {
    id: "sans-italic",
    name: "𝘚𝘢𝘯𝘴 𝘐𝘵𝘢𝘭𝘪𝘤",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d608, lowerBase: 0x1d622 }),
  },
  {
    id: "sans-bold-italic",
    name: "𝙎𝙖𝙣𝙨 𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d63c, lowerBase: 0x1d656 }),
  },
  {
    id: "monospace",
    name: "𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎",
    category: "Bold & Italic",
    transform: makeRangeStyle({ upperBase: 0x1d670, lowerBase: 0x1d68a, digitBase: 0x1d7f6 }),
  },

  // ─── Cursive & Script ─────────────────────────────────────────────────────
  {
    id: "script",
    name: "𝒮𝒸𝓇𝒾𝓅𝓉",
    category: "Cursive & Script",
    transform: makeRangeStyle({ upperBase: 0x1d49c, lowerBase: 0x1d4b0, holes: SCRIPT_HOLES }),
  },
  {
    id: "bold-script",
    name: "𝓑𝓸𝓵𝓭 𝓢𝓬𝓻𝓲𝓹𝓽",
    category: "Cursive & Script",
    transform: makeRangeStyle({ upperBase: 0x1d4d0, lowerBase: 0x1d4ea }),
  },

  // ─── Gothic & Fancy ───────────────────────────────────────────────────────
  {
    id: "fraktur",
    name: "𝔉𝔯𝔞𝔨𝔱𝔲𝔯",
    category: "Gothic & Fancy",
    transform: makeRangeStyle({ upperBase: 0x1d504, lowerBase: 0x1d51e, holes: FRAKTUR_HOLES }),
  },
  {
    id: "bold-fraktur",
    name: "𝕭𝖔𝖑𝖉 𝕱𝖗𝖆𝖐𝖙𝖚𝖗",
    category: "Gothic & Fancy",
    transform: makeRangeStyle({ upperBase: 0x1d56c, lowerBase: 0x1d586 }),
  },
  {
    id: "double-struck",
    name: "𝔻𝕠𝕦𝕓𝕝𝕖 𝕊𝕥𝕣𝕦𝕔𝕜",
    category: "Gothic & Fancy",
    transform: makeRangeStyle({
      upperBase: 0x1d538,
      lowerBase: 0x1d552,
      digitBase: 0x1d7d8,
      holes: DOUBLESTRUCK_HOLES,
    }),
  },
  {
    id: "fullwidth",
    name: "Ｆｕｌｌｗｉｄｔｈ",
    category: "Gothic & Fancy",
    transform: makeRangeStyle({ upperBase: 0xff21, lowerBase: 0xff41, digitBase: 0xff10 }),
  },

  // ─── Bubble & Circled ─────────────────────────────────────────────────────
  {
    id: "circled",
    name: "Ⓒⓘⓡⓒⓛⓔⓓ",
    category: "Bubble & Circled",
    transform: makeRangeStyle({
      upperBase: 0x24b6,
      lowerBase: 0x24d0,
      holes: { "0": "\u24ea" },
      // digits 1-9 → U+2460..U+2468 handled via a second pass below
    }),
  },
  {
    id: "circled-neg",
    name: "🅒🅘🅡🅒🅛🅔🅓",
    category: "Bubble & Circled",
    transform: makeRangeStyle({ upperBase: 0x1f150, lowerBase: 0x1f150 }),
  },
  {
    id: "squared",
    name: "🅂🅀🅄🄰🅁🄴🄳",
    category: "Bubble & Circled",
    transform: makeRangeStyle({ upperBase: 0x1f130, lowerBase: 0x1f130 }),
  },
  {
    id: "squared-neg",
    name: "🆂🆀🆄🅰🆁🅴🅳",
    category: "Bubble & Circled",
    transform: makeRangeStyle({ upperBase: 0x1f170, lowerBase: 0x1f170 }),
  },
  {
    id: "parens",
    name: "⒫⒜⒭⒠⒩⒮",
    category: "Bubble & Circled",
    transform: makeRangeStyle({ lowerBase: 0x249c }),
  },
  {
    id: "regional",
    name: "🇷 🇪 🇬 🇮 🇴 🇳 🇦 🇱",
    category: "Bubble & Circled",
    transform: makeRangeStyle({ upperBase: 0x1f1e6, lowerBase: 0x1f1e6 }),
  },

  // ─── Small & Tiny ─────────────────────────────────────────────────────────
  {
    id: "small-caps",
    name: "sᴍᴀʟʟ ᴄᴀᴘs",
    category: "Small & Tiny",
    transform: (input) => {
      let out = "";
      for (const ch of input) out += SMALL_CAPS[ch.toLowerCase()] ?? ch;
      return out;
    },
  },
  {
    id: "superscript",
    name: "ˢᵘᵖᵉʳˢᶜʳⁱᵖᵗ",
    category: "Small & Tiny",
    transform: makeTableStyle(SUPERSCRIPT),
  },
  {
    id: "subscript",
    name: "ₛᵤᵦₛcᵣᵢₚₜ",
    category: "Small & Tiny",
    transform: makeTableStyle(SUBSCRIPT),
  },

  // ─── Upside-Down & Mirrored ───────────────────────────────────────────────
  {
    id: "upside-down",
    name: "uʍop ǝpᴉsdn",
    category: "Upside-Down & Mirrored",
    transform: (input) => {
      let out = "";
      for (const ch of input) out += UPSIDE_DOWN[ch] ?? UPSIDE_DOWN[ch.toLowerCase()] ?? ch;
      return [...out].reverse().join("");
    },
  },
  {
    id: "mirrored",
    name: "bɘɿoɿɿiM",
    category: "Upside-Down & Mirrored",
    transform: (input) => {
      let out = "";
      for (const ch of input) out += MIRRORED[ch] ?? ch;
      return [...out].reverse().join("");
    },
  },
  {
    id: "reversed",
    name: "desreveR",
    category: "Upside-Down & Mirrored",
    transform: (input) => [...input].reverse().join(""),
  },

  // ─── Combining marks ──────────────────────────────────────────────────────
  {
    id: "strikethrough",
    name: "S̶t̶r̶i̶k̶e̶",
    category: "Symbols & Decorative",
    transform: combining("\u0336"),
  },
  {
    id: "underline",
    name: "U̲n̲d̲e̲r̲l̲i̲n̲e̲",
    category: "Symbols & Decorative",
    transform: combining("\u0332"),
  },
  {
    id: "double-underline",
    name: "D̳o̳u̳b̳l̳e̳",
    category: "Symbols & Decorative",
    transform: combining("\u0333"),
  },
  {
    id: "overline",
    name: "O̅v̅e̅r̅l̅i̅n̅e̅",
    category: "Symbols & Decorative",
    transform: combining("\u0305"),
  },
  {
    id: "tilde",
    name: "T̃ĩl̃d̃ẽ",
    category: "Symbols & Decorative",
    transform: combining("\u0303"),
  },

  // ─── Symbols & Decorative wrappers ────────────────────────────────────────
  {
    id: "wrap-sparkle",
    name: "✧a✧b✧c✧",
    category: "Symbols & Decorative",
    transform: (input) => "✧" + [...input].filter((c) => c !== " ").join("✧") + "✧",
  },
  {
    id: "wrap-hearts",
    name: "♡a♡b♡c♡",
    category: "Symbols & Decorative",
    transform: (input) => "♡" + [...input].filter((c) => c !== " ").join("♡") + "♡",
  },
  {
    id: "wrap-dots",
    name: "•a•b•c•",
    category: "Symbols & Decorative",
    transform: (input) => "•" + [...input].filter((c) => c !== " ").join("•") + "•",
  },
  {
    id: "wrap-stars",
    name: "★彡text彡★",
    category: "Symbols & Decorative",
    transform: (input) => `★彡[${input}]彡★`,
  },
  {
    id: "wrap-arrows",
    name: "»»text««",
    category: "Symbols & Decorative",
    transform: (input) => `»»-------► ${input} ◄-------««`,
  },
  {
    id: "wrap-flowers",
    name: "✿ text ✿",
    category: "Symbols & Decorative",
    transform: (input) => `✿ ${input} ✿`,
  },
  {
    id: "wrap-lenny",
    name: "( ͡° ͜ʖ ͡°) text",
    category: "Symbols & Decorative",
    transform: (input) => `( ͡° ͜ʖ ͡°) ${input}`,
  },
  {
    id: "wrap-royal",
    name: "•?((¯°·._.• text •._.·°¯))؟•",
    category: "Symbols & Decorative",
    transform: (input) => `•?((¯°·._.• ${input} •._.·°¯))؟•`,
  },
  {
    id: "wrap-brackets",
    name: "『text』",
    category: "Symbols & Decorative",
    transform: (input) => `『${input}』`,
  },
  {
    id: "wrap-corners",
    name: "「text」",
    category: "Symbols & Decorative",
    transform: (input) => `「${input}」`,
  },
  {
    id: "spaced",
    name: "S p a c e d",
    category: "Symbols & Decorative",
    transform: (input) => [...input].join(" "),
  },
];

// Post-process: circled digits 1-9 use a separate range from letters. Patch
// the "circled" style so digits map correctly (not via the letter base).
const CIRCLED_DIGITS = [
  "\u24ea",
  "\u2460",
  "\u2461",
  "\u2462",
  "\u2463",
  "\u2464",
  "\u2465",
  "\u2466",
  "\u2467",
  "\u2468",
];
const circledIndex = STYLES.findIndex((s) => s.id === "circled");
if (circledIndex !== -1) {
  const base = STYLES[circledIndex].transform;
  STYLES[circledIndex] = {
    ...STYLES[circledIndex],
    transform: (input) => {
      const first = base(input);
      let out = "";
      for (const ch of first) {
        const code = ch.charCodeAt(0);
        if (code >= ZERO && code <= NINE) out += CIRCLED_DIGITS[code - ZERO];
        else out += ch;
      }
      return out;
    },
  };
}

export const CATEGORIES: StyleCategory[] = [
  "Bold & Italic",
  "Cursive & Script",
  "Bubble & Circled",
  "Gothic & Fancy",
  "Upside-Down & Mirrored",
  "Small & Tiny",
  "Symbols & Decorative",
];

/**
 * Character-count helpers.
 * - `platformLength` mirrors `.length` (UTF-16 code units), which is what
 *   Instagram/TikTok/X count against bio and caption limits. Characters
 *   outside the Basic Multilingual Plane (like Mathematical Alphanumeric
 *   Symbols) each cost 2 code units — this is the trap most users miss.
 * - `visibleLength` counts user-perceived characters (code points).
 */
export function platformLength(str: string): number {
  return str.length;
}

export function visibleLength(str: string): number {
  return [...str].length;
}
