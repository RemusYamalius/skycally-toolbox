import { ELEMENT_BY_SYMBOL, type ChemElement } from "@/data/elements";

export type AnimationType =
  | "calm"
  | "bubble"
  | "explosion"
  | "crystal"
  | "glow"
  | "flame"
  | "sparkle"
  | "danger";

export type DiscoveryCategory =
  | "life"
  | "kitchen"
  | "lab"
  | "energy"
  | "minerals"
  | "industrial"
  | "unknown";

export interface Compound {
  /** Canonical Hill-system key, e.g. "H2O", "ClNa", "CHNaO3". */
  key: string;
  /** Pretty formula tokens used for rendering with subscripts. */
  display: Array<{ s: string; n: number }>;
  name: string;
  description: string;
  uses?: string;
  funFact: string;
  animation: AnimationType;
  cat: DiscoveryCategory;
}

const tok = (formula: string): Array<{ s: string; n: number }> => {
  const out: Array<{ s: string; n: number }> = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula)) !== null) {
    if (!m[1]) continue;
    out.push({ s: m[1], n: m[2] ? parseInt(m[2], 10) : 1 });
  }
  return out;
};

// Canonical Hill key from a symbol→count map.
export function hillKey(atoms: Record<string, number>): string {
  const entries = Object.entries(atoms).filter(([, n]) => n > 0);
  if (entries.length === 0) return "";
  const hasC = entries.some(([s]) => s === "C");
  const parts: Array<[string, number]> = [];
  if (hasC) {
    const c = entries.find(([s]) => s === "C")!;
    parts.push(c);
    const h = entries.find(([s]) => s === "H");
    if (h) parts.push(h);
    entries
      .filter(([s]) => s !== "C" && s !== "H")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach((e) => parts.push(e));
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0])).forEach((e) => parts.push(e));
  }
  return parts.map(([s, n]) => (n === 1 ? s : `${s}${n}`)).join("");
}

const c = (
  display: string,
  name: string,
  description: string,
  funFact: string,
  animation: AnimationType,
  cat: DiscoveryCategory,
  uses?: string,
): Compound => {
  const tokens = tok(display);
  const atoms: Record<string, number> = {};
  for (const t of tokens) atoms[t.s] = (atoms[t.s] ?? 0) + t.n;
  return {
    key: hillKey(atoms),
    display: tokens,
    name,
    description,
    funFact,
    animation,
    cat,
    uses,
  };
};

export const COMPOUNDS: Compound[] = [
  // Water & basics
  c("H2O", "Water", "The molecule of life — a covalent bond between hydrogen and oxygen.", "Without it, no biology — and 60% of you IS water.", "calm", "life", "Drinking, cooking, cleaning, everything"),
  c("CO2", "Carbon Dioxide", "What you exhale, what plants breathe.", "Frozen, it sublimates straight into fog — that's dry ice.", "bubble", "life", "Photosynthesis, fizzy drinks, fire extinguishers"),
  c("O2", "Oxygen Gas", "Essential for breathing and combustion.", "Oxygen makes up 21% of every breath you take.", "sparkle", "life", "Breathing, welding, rocket fuel"),
  c("H2", "Hydrogen Gas", "The lightest element — and possibly the future fuel.", "Burns to form only water — no carbon emissions.", "glow", "energy", "Fuel cells, rocketry"),
  c("N2", "Nitrogen Gas", "Makes up 78% of the air you breathe.", "Liquid nitrogen boils at -196°C and shatters roses.", "calm", "life", "Food packaging, fertilizers"),

  // Salts & minerals
  c("NaCl", "Table Salt", "Sodium chloride — on every dinner table worldwide.", "Salt was once so valuable Roman soldiers were paid in it (salary).", "crystal", "kitchen", "Food, preservation, melting ice"),
  c("CaCO3", "Calcium Carbonate", "Chalk, marble, limestone — and seashells too.", "The White Cliffs of Dover are basically pure calcium carbonate.", "crystal", "minerals", "Construction, antacids, paper"),
  c("MgO", "Magnesium Oxide", "Used in antacids and refractory bricks.", "Magnesium burns with a blinding white light — once used in flash photography.", "glow", "industrial"),
  c("KCl", "Potassium Chloride", "A salt substitute and a medical electrolyte.", "Tastes salty but slightly bitter — used in low-sodium diets.", "crystal", "kitchen"),
  c("SiO2", "Silicon Dioxide", "Sand, glass, quartz — and the crystals in your watch.", "Glass is just sand that's been melted and cooled fast enough to skip becoming a crystal.", "crystal", "minerals"),
  c("Fe2O3", "Iron Oxide (Rust)", "Iron's eternal enemy — and the colour of Mars.", "Mars looks red because its surface is covered in rust.", "glow", "minerals", "Pigments, magnetic media"),
  c("Al2O3", "Aluminum Oxide", "Sapphires and rubies are this — coloured by tiny impurities.", "Pure corundum is colorless; chromium turns it red (ruby), iron + titanium blue (sapphire).", "crystal", "minerals"),

  // Acids & bases
  c("HCl", "Hydrochloric Acid", "Strong acid — and it's in your stomach right now.", "Your stomach lining renews itself every few days to survive its own acid.", "bubble", "lab"),
  c("H2SO4", "Sulfuric Acid", "The most produced chemical in industry.", "It's so hygroscopic it can dehydrate sugar into pure carbon.", "danger", "industrial"),
  c("NaOH", "Sodium Hydroxide", "Lye — used in soap making and drain cleaner.", "Pretzels get their distinctive crust from a quick lye bath before baking.", "danger", "lab"),
  c("NH3", "Ammonia", "Pungent gas used in cleaning products and fertilizers.", "Half the world's food supply depends on nitrogen fertilizer made from ammonia.", "danger", "industrial"),
  c("HNO3", "Nitric Acid", "Used to make fertilizers and explosives.", "Reacts with proteins to leave a yellow stain — chemists call it the xanthoproteic test.", "danger", "industrial"),

  // Organic
  c("CH4", "Methane", "Natural gas — and cow burps.", "Methane is over 80× more potent than CO₂ as a greenhouse gas in the short term.", "flame", "energy"),
  c("C2H6O", "Ethanol", "The alcohol in beer, wine, and spirits.", "Pure ethanol is hygroscopic — it pulls water right out of the air.", "bubble", "energy", "Drinks, fuel, antiseptic"),
  c("C6H12O6", "Glucose", "Your brain's preferred fuel.", "Your brain uses about 120 g of glucose per day — roughly half your daily carbs.", "glow", "life"),
  c("C12H22O11", "Sucrose", "Plain old table sugar.", "Sugar crystals are technically tiny semiconductors and emit faint blue light when crushed (triboluminescence).", "sparkle", "kitchen"),
  c("C3H8", "Propane", "Camping stoves and outdoor grills.", "Stored as a liquid under pressure, it expands 270× when released as gas.", "flame", "energy"),
  c("C8H18", "Octane", "A main component of gasoline.", "The 'octane rating' at the pump is actually how much it resists knocking, not the % of octane.", "flame", "energy"),

  // Famous & interesting
  c("H2O2", "Hydrogen Peroxide", "Bleach, antiseptic — and rocket propellant.", "Concentrated peroxide will set wood on fire on contact.", "bubble", "lab"),
  c("NO2", "Nitrogen Dioxide", "The reddish-brown gas in smog.", "Its smell is the sharp, acrid one you notice after a thunderstorm or near busy traffic.", "danger", "industrial"),
  c("SO2", "Sulfur Dioxide", "Volcano gas and the main cause of acid rain.", "It's why struck matches and erupting volcanoes have a similar sharp smell.", "danger", "industrial"),
  c("N2O", "Nitrous Oxide", "Laughing gas — used by dentists and whipped-cream makers.", "Discovered in 1772 and used at parties before anyone tried it as anaesthesia.", "sparkle", "lab"),
  c("Fe3O4", "Magnetite", "A naturally magnetic mineral — the original lodestone.", "Ancient Chinese compasses used carved magnetite spoons.", "glow", "minerals"),
  c("TiO2", "Titanium Dioxide", "In sunscreen, white paint, and toothpaste.", "The whitest white known — reflects almost all visible light.", "sparkle", "industrial"),
  c("CHNaO3", "Baking Soda", "Sodium bicarbonate — kitchen chemistry hero.", "Add vinegar and you get the classic volcano: CO₂, water, and sodium acetate.", "bubble", "kitchen"),
  c("CaF2", "Calcium Fluoride", "Found in toothpaste and naturally as fluorite.", "Fluorite glows under UV light — that's where the word 'fluorescence' comes from.", "glow", "minerals"),
  c("PbS", "Galena", "The shiniest natural mineral and the main ore of lead.", "Used in the first crystal radios as a natural semiconductor.", "crystal", "minerals"),
  c("AgCl", "Silver Chloride", "Used in photographic film and sun-sensitive lenses.", "Darkens in sunlight — that's how old photo paper worked.", "sparkle", "lab"),
  c("OZn", "Zinc Oxide", "In diaper cream, sunscreen, and white paint.", "Blocks both UVA and UVB — the original mineral sunscreen.", "sparkle", "industrial"),
  c("MnO2", "Manganese Dioxide", "Powers your AA and AAA batteries.", "Also makes Egyptian glass black and was used as a pigment 17,000 years ago in cave art.", "glow", "industrial"),
  c("CNa2O3", "Sodium Carbonate", "Washing soda — and a key ingredient in glass.", "Used by ancient Egyptians (called natron) to mummify bodies.", "crystal", "industrial"),
  c("KNO3", "Potassium Nitrate", "Saltpetre — the oxidizer in classic gunpowder.", "Mix it 75:15:10 with charcoal and sulfur and you have gunpowder.", "explosion", "industrial"),
  c("C", "Carbon", "Pure carbon — from pencil graphite to diamond.", "Same atom, different bonds: graphite is soft and slippery, diamond is the hardest natural substance.", "crystal", "minerals"),
  c("Si", "Silicon", "The element in every computer chip on Earth.", "Silicon Valley is named after this — the second most abundant element in Earth's crust.", "sparkle", "industrial"),
  c("Au", "Gold", "The noble metal — never rusts, never tarnishes.", "All the gold ever mined would fit into a cube about 22 m on each side.", "glow", "minerals"),
  c("Ag", "Silver", "Antimicrobial, conductive, and used in mirrors.", "Silver is the best electrical and thermal conductor of any metal.", "sparkle", "minerals"),
];

export const COMPOUND_BY_KEY: Record<string, Compound> = Object.fromEntries(
  COMPOUNDS.map((x) => [x.key, x]),
);

export const DISCOVERY_CATEGORIES: Array<{ id: DiscoveryCategory; label: string; emoji: string }> = [
  { id: "life", label: "Life Essentials", emoji: "💧" },
  { id: "kitchen", label: "Kitchen Chemistry", emoji: "🧂" },
  { id: "lab", label: "Lab Classics", emoji: "⚗️" },
  { id: "energy", label: "Energy & Fuels", emoji: "🔥" },
  { id: "minerals", label: "Minerals & Gems", emoji: "💎" },
  { id: "industrial", label: "Industrial Giants", emoji: "🚀" },
  { id: "unknown", label: "Unknown Territory", emoji: "❓" },
];

export interface MixResult {
  formula: Array<{ s: string; n: number }>;
  key: string;
  known: Compound | null;
  unknownDescription?: string;
  animation: AnimationType;
}

const isNoble = (e: ChemElement) => e.category === "noble-gas";
const isMetal = (e: ChemElement) =>
  ["alkali", "alkaline-earth", "transition", "post-transition", "lanthanide", "actinide"].includes(
    e.category,
  );

export function generateUnknown(atoms: Record<string, number>): string {
  const els = Object.keys(atoms)
    .map((s) => ELEMENT_BY_SYMBOL[s])
    .filter(Boolean);
  if (els.some(isNoble)) {
    return "Highly unstable — noble gases rarely bond. If forced together this compound would decay in a fraction of a second, releasing a soft blue flash.";
  }
  const heavy = els.find((e) => e.z > 80 && !isNoble(e));
  if (heavy) {
    return `Would be extraordinarily dense and almost certainly toxic. The presence of ${heavy.name.toLowerCase()} suggests a heavy, dark, radioactive solid that should never be handled bare-handed.`;
  }
  const onlyCH = els.length === 2 && els.every((e) => e.symbol === "C" || e.symbol === "H");
  if (onlyCH) {
    return "Could be an unknown hydrocarbon — likely a flammable liquid or gas with a faint petrol smell, useful in theory as a fuel.";
  }
  const onlyMetalsAndO =
    els.every((e) => isMetal(e) || e.symbol === "O") && els.some((e) => e.symbol === "O");
  if (onlyMetalsAndO) {
    return "Might form an exotic oxide not yet synthesized — possibly a brittle, brightly coloured ceramic with interesting magnetic properties.";
  }
  return "A theoretical compound — its properties would depend on the bond geometry. Imagine a faintly silvery substance that reacts slowly with light, settling into crystals overnight.";
}

export function pickAnimationForUnknown(atoms: Record<string, number>): AnimationType {
  const els = Object.keys(atoms)
    .map((s) => ELEMENT_BY_SYMBOL[s])
    .filter(Boolean);
  if (els.some(isNoble)) return "glow";
  if (els.some((e) => e.symbol === "H") && els.some((e) => e.symbol === "C")) return "flame";
  if (els.some((e) => e.symbol === "O")) return "bubble";
  if (els.some(isMetal)) return "crystal";
  return "sparkle";
}

export function mix(atoms: Record<string, number>): MixResult | null {
  const cleaned: Record<string, number> = {};
  for (const [s, n] of Object.entries(atoms)) if (n > 0) cleaned[s] = n;
  if (Object.keys(cleaned).length === 0) return null;
  const key = hillKey(cleaned);
  const known = COMPOUND_BY_KEY[key] ?? null;

  // Build display tokens. Known compounds keep their canonical display order
  // (e.g. H2O, NaCl, C2H5OH). Otherwise show alphabetical by symbol with C first.
  let display: Array<{ s: string; n: number }>;
  if (known) {
    display = known.display;
  } else {
    const order = Object.keys(cleaned).sort((a, b) => {
      if (a === "C") return -1;
      if (b === "C") return 1;
      if (a === "H") return -1;
      if (b === "H") return 1;
      return a.localeCompare(b);
    });
    display = order.map((s) => ({ s, n: cleaned[s] }));
  }

  return {
    formula: display,
    key,
    known,
    unknownDescription: known ? undefined : generateUnknown(cleaned),
    animation: known ? known.animation : pickAnimationForUnknown(cleaned),
  };
}
