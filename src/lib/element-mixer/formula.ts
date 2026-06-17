import { ELEMENT_BY_SYMBOL, type ChemElement } from "@/data/elements";

export type AnimationType = "calm" | "bubble" | "explosion" | "crystal" | "glow" | "flame" | "sparkle" | "danger";

export type DiscoveryCategory = "life" | "kitchen" | "lab" | "energy" | "minerals" | "industrial" | "unknown";

export interface Compound {
  key: string;
  display: Array<{ s: string; n: number }>;
  name: string;
  description: string;
  uses?: string;
  funFact: string;
  animation: AnimationType;
  cat: DiscoveryCategory;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  return { key: hillKey(atoms), display: tokens, name, description, funFact, animation, cat, uses };
};

// ─── Compounds database ───────────────────────────────────────────────────────
export const COMPOUNDS: Compound[] = [
  // ── Life Essentials ──
  c(
    "H2O",
    "Water",
    "The molecule of life — a covalent bond between hydrogen and oxygen.",
    "Without it, no biology — and 60% of you IS water.",
    "calm",
    "life",
    "Drinking, cooking, cleaning, everything",
  ),
  c(
    "CO2",
    "Carbon Dioxide",
    "What you exhale, what plants breathe.",
    "Frozen, it sublimates straight into fog — that's dry ice.",
    "bubble",
    "life",
    "Photosynthesis, fizzy drinks, fire extinguishers",
  ),
  c(
    "O2",
    "Oxygen Gas",
    "Essential for breathing and combustion.",
    "Oxygen makes up 21% of every breath you take.",
    "sparkle",
    "life",
    "Breathing, welding, rocket fuel",
  ),
  c(
    "H2",
    "Hydrogen Gas",
    "The lightest element — and the future fuel.",
    "Burns to form only water — zero carbon emissions.",
    "glow",
    "energy",
    "Fuel cells, rocketry, weather balloons",
  ),
  c(
    "N2",
    "Nitrogen Gas",
    "Makes up 78% of the air you breathe.",
    "Liquid nitrogen boils at −196 °C and shatters roses.",
    "calm",
    "life",
    "Food packaging, fertilizers, cryogenics",
  ),
  c(
    "O3",
    "Ozone",
    "The protective shield around Earth — and an air pollutant near the ground.",
    "That sharp electric smell after a thunderstorm IS ozone.",
    "sparkle",
    "life",
    "UV protection, water treatment",
  ),
  c(
    "H2S",
    "Hydrogen Sulfide",
    "The gas that smells like rotten eggs.",
    "Your body actually produces tiny amounts as a signalling molecule.",
    "danger",
    "lab",
    "Naturally found in volcanoes and swamps",
  ),
  c(
    "CO",
    "Carbon Monoxide",
    "The silent killer — colorless, odorless, deadly.",
    "Binds to haemoglobin 250× more tightly than oxygen, starving cells.",
    "danger",
    "lab",
    "Produced by incomplete combustion",
  ),
  c(
    "NH3",
    "Ammonia",
    "Pungent gas used in cleaning products and fertilizers.",
    "Half the world's food supply depends on nitrogen fertilizer made from ammonia.",
    "danger",
    "industrial",
    "Fertilizers, cleaning, refrigeration",
  ),

  // ── Kitchen Chemistry ──
  c(
    "NaCl",
    "Table Salt",
    "Sodium chloride — on every dinner table worldwide.",
    "Salt was so valuable Roman soldiers were paid in it (salary).",
    "crystal",
    "kitchen",
    "Food, preservation, melting ice",
  ),
  c(
    "CHNaO3",
    "Baking Soda",
    "Sodium bicarbonate — the kitchen chemistry hero.",
    "Add vinegar: CO₂ bubbles, water, sodium acetate — instant volcano!",
    "bubble",
    "kitchen",
    "Baking, cleaning, fire extinguishers",
  ),
  c(
    "C12H22O11",
    "Sucrose",
    "Plain old table sugar.",
    "Sugar crystals emit faint blue light when crushed (triboluminescence).",
    "sparkle",
    "kitchen",
    "Cooking, preservation, fermentation",
  ),
  c(
    "C6H12O6",
    "Glucose",
    "Your brain's preferred fuel.",
    "Your brain uses ~120 g of glucose per day — half your daily carbs.",
    "glow",
    "life",
    "Energy metabolism, IV fluids",
  ),
  c(
    "KCl",
    "Potassium Chloride",
    "A salt substitute and a medical electrolyte.",
    "Tastes salty but slightly bitter — used in low-sodium diets.",
    "crystal",
    "kitchen",
  ),
  c(
    "C2H4O2",
    "Acetic Acid",
    "The acid that makes vinegar sharp.",
    "White wine + air + bacteria = vinegar, every time.",
    "bubble",
    "kitchen",
    "Vinegar, food preservation, cleaning",
  ),
  c(
    "C6H8O7",
    "Citric Acid",
    "The sour in lemons, limes, and fizzy drinks.",
    "Your cells produce it constantly in the Krebs energy cycle.",
    "sparkle",
    "kitchen",
    "Flavouring, preservative, cleaning agent",
  ),
  c(
    "NaF",
    "Sodium Fluoride",
    "The active ingredient in most fluoride toothpaste.",
    "Added to drinking water since 1945 to reduce tooth decay.",
    "sparkle",
    "kitchen",
    "Toothpaste, water fluoridation",
  ),

  // ── Lab Classics ──
  c(
    "HCl",
    "Hydrochloric Acid",
    "Strong acid — and it's in your stomach right now.",
    "Your stomach lining renews itself every few days to survive its own acid.",
    "bubble",
    "lab",
  ),
  c(
    "H2SO4",
    "Sulfuric Acid",
    "The most produced chemical in all of industry.",
    "It's so hygroscopic it can dehydrate sugar into pure carbon.",
    "danger",
    "industrial",
  ),
  c(
    "NaOH",
    "Sodium Hydroxide",
    "Lye — used in soap making and drain cleaner.",
    "Pretzels get their distinctive crust from a quick lye bath before baking.",
    "danger",
    "lab",
  ),
  c(
    "HNO3",
    "Nitric Acid",
    "Used to make fertilizers and explosives.",
    "Reacts with proteins leaving a yellow stain — the xanthoproteic test.",
    "danger",
    "industrial",
  ),
  c(
    "H2O2",
    "Hydrogen Peroxide",
    "Bleach, antiseptic — and rocket propellant.",
    "Concentrated H₂O₂ sets wood on fire on contact.",
    "bubble",
    "lab",
  ),
  c(
    "N2O",
    "Nitrous Oxide",
    "Laughing gas — used by dentists and whipped-cream makers.",
    "Discovered in 1772 and used at parties before anyone tried it as anaesthesia.",
    "sparkle",
    "lab",
  ),
  c(
    "FeCl3",
    "Iron(III) Chloride",
    "Used to etch printed circuit boards.",
    "Turns skin deep brown on contact — popular in metal-etching art.",
    "danger",
    "lab",
  ),
  c(
    "CuSO4",
    "Copper Sulfate",
    "Brilliant blue crystals used in chemistry labs and agriculture.",
    "Heat the blue crystals and they turn white — the water is trapped inside!",
    "crystal",
    "lab",
    "Fungicide, electroplating, lab reagent",
  ),
  c(
    "KMnO4",
    "Potassium Permanganate",
    "Deep purple crystals that disinfect water.",
    "A few crystals in water turns it vivid purple — a classic demonstration.",
    "explosion",
    "lab",
  ),
  c(
    "AgCl",
    "Silver Chloride",
    "Used in photographic film and sun-sensitive lenses.",
    "Darkens in sunlight — that's exactly how old photo paper worked.",
    "sparkle",
    "lab",
  ),
  c(
    "BaSO4",
    "Barium Sulfate",
    "Used in X-ray imaging of the digestive system.",
    "Patients drink a 'barium meal' — it's opaque to X-rays.",
    "calm",
    "lab",
    "Medical imaging, paint filler",
  ),

  // ── Energy & Fuels ──
  c(
    "CH4",
    "Methane",
    "Natural gas — and cow burps.",
    "Methane is 80× more potent than CO₂ as a short-term greenhouse gas.",
    "flame",
    "energy",
  ),
  c(
    "C2H6O",
    "Ethanol",
    "The alcohol in beer, wine, and spirits.",
    "Pure ethanol pulls water right out of the air.",
    "bubble",
    "energy",
    "Drinks, fuel, antiseptic",
  ),
  c(
    "C3H8",
    "Propane",
    "Camping stoves and outdoor grills.",
    "Stored as liquid under pressure, expands 270× when released as gas.",
    "flame",
    "energy",
  ),
  c(
    "C8H18",
    "Octane",
    "A main component of gasoline.",
    "The 'octane rating' at the pump measures knock resistance, not % octane.",
    "flame",
    "energy",
  ),
  c(
    "C2H2",
    "Acetylene",
    "Burns hotter than almost anything — used in welding.",
    "The oxyacetylene flame reaches 3,500 °C — hot enough to cut steel.",
    "flame",
    "energy",
    "Welding, cutting, lighting",
  ),
  c(
    "C6H6",
    "Benzene",
    "The simplest aromatic compound — a ring of 6 carbons.",
    "Kekulé claimed to discover its ring structure in a dream of a snake eating its tail.",
    "flame",
    "lab",
  ),

  // ── Minerals & Gems ──
  c(
    "CaCO3",
    "Calcium Carbonate",
    "Chalk, marble, limestone — and seashells too.",
    "The White Cliffs of Dover are basically pure calcium carbonate.",
    "crystal",
    "minerals",
    "Construction, antacids, paper",
  ),
  c(
    "SiO2",
    "Silicon Dioxide",
    "Sand, glass, quartz — and the crystals in your watch.",
    "Glass is just sand melted and cooled fast enough to skip crystallising.",
    "crystal",
    "minerals",
  ),
  c(
    "Fe2O3",
    "Iron Oxide (Rust)",
    "Iron's eternal enemy — and the colour of Mars.",
    "Mars looks red because its surface is covered in rust.",
    "glow",
    "minerals",
    "Pigments, magnetic media, thermite",
  ),
  c(
    "Al2O3",
    "Aluminum Oxide",
    "Sapphires and rubies are this — coloured by tiny impurities.",
    "Chromium traces → ruby (red); iron + titanium → sapphire (blue).",
    "crystal",
    "minerals",
  ),
  c(
    "Fe3O4",
    "Magnetite",
    "A naturally magnetic mineral — the original lodestone.",
    "Ancient Chinese compasses used carved magnetite spoons.",
    "glow",
    "minerals",
  ),
  c(
    "CaF2",
    "Calcium Fluoride",
    "Found in toothpaste and naturally as fluorite.",
    "Fluorite glows under UV light — that's where 'fluorescence' comes from.",
    "glow",
    "minerals",
  ),
  c(
    "PbS",
    "Galena",
    "The shiniest natural mineral and the main ore of lead.",
    "Used in the first crystal radios as a natural semiconductor.",
    "crystal",
    "minerals",
  ),
  c(
    "FeS2",
    "Iron Pyrite",
    "Fool's Gold — shiny enough to fool 16th-century prospectors.",
    "More iron is refined from pyrite than from any other iron ore.",
    "sparkle",
    "minerals",
  ),
  c(
    "OZn",
    "Zinc Oxide",
    "In diaper cream, sunscreen, and white paint.",
    "Blocks both UVA and UVB — the original mineral sunscreen.",
    "sparkle",
    "minerals",
  ),
  c(
    "CuO",
    "Copper Oxide",
    "The black tarnish on old copper coins.",
    "Used to colour ancient Egyptian glass green and blue.",
    "glow",
    "minerals",
  ),
  c(
    "Ag2S",
    "Silver Sulfide",
    "The black tarnish on silver.",
    "Forms when silver contacts sulfur compounds in eggs or rubber bands.",
    "crystal",
    "minerals",
  ),
  c(
    "C",
    "Carbon",
    "Pure carbon — from pencil graphite to diamond.",
    "Same atom, different bonds: graphite is slippery, diamond is the hardest natural substance.",
    "crystal",
    "minerals",
  ),
  c(
    "Si",
    "Silicon",
    "The element in every computer chip on Earth.",
    "Silicon Valley is named after it — second most abundant element in Earth's crust.",
    "sparkle",
    "minerals",
  ),
  c(
    "Au",
    "Gold",
    "The noble metal — never rusts, never tarnishes.",
    "All the gold ever mined would fit in a cube ~22 m on each side.",
    "glow",
    "minerals",
  ),
  c(
    "Ag",
    "Silver",
    "Antimicrobial, conductive, and used in mirrors.",
    "Silver is the best electrical and thermal conductor of all metals.",
    "sparkle",
    "minerals",
  ),

  // ── Industrial Giants ──
  c(
    "MgO",
    "Magnesium Oxide",
    "Used in antacids and refractory bricks.",
    "Magnesium burns with a blinding white light — once used in flash photography.",
    "glow",
    "industrial",
  ),
  c(
    "TiO2",
    "Titanium Dioxide",
    "In sunscreen, white paint, and toothpaste.",
    "The whitest white known — reflects almost all visible light.",
    "sparkle",
    "industrial",
  ),
  c(
    "SO2",
    "Sulfur Dioxide",
    "Volcano gas and the main cause of acid rain.",
    "Why struck matches and erupting volcanoes share the same sharp smell.",
    "danger",
    "industrial",
  ),
  c(
    "NO2",
    "Nitrogen Dioxide",
    "The reddish-brown gas in smog.",
    "Its sharp smell is what you notice near heavy traffic.",
    "danger",
    "industrial",
  ),
  c(
    "MnO2",
    "Manganese Dioxide",
    "Powers your AA and AAA batteries.",
    "Also used as a pigment 17,000 years ago in cave art.",
    "glow",
    "industrial",
  ),
  c(
    "CNa2O3",
    "Sodium Carbonate",
    "Washing soda — a key ingredient in glass.",
    "Used by ancient Egyptians (called natron) to mummify bodies.",
    "crystal",
    "industrial",
  ),
  c(
    "KNO3",
    "Potassium Nitrate",
    "Saltpetre — the oxidizer in classic gunpowder.",
    "Mix 75:15:10 with charcoal and sulfur → gunpowder.",
    "explosion",
    "industrial",
  ),
  c(
    "CaCl2",
    "Calcium Chloride",
    "Melts ice faster than table salt.",
    "Also used to firm up instant noodles.",
    "crystal",
    "industrial",
  ),
  c(
    "Na2SO4",
    "Sodium Sulfate",
    "Glauber's salt — used in detergents and paper.",
    "Crystallises beautifully when a hot saturated solution cools slowly.",
    "crystal",
    "industrial",
  ),
  c(
    "CaO",
    "Quicklime",
    "Calcium oxide — burns violently on contact with water.",
    "Used in cement and to preserve Viking ships for centuries.",
    "flame",
    "industrial",
  ),
  c(
    "P4O10",
    "Phosphorus Pentoxide",
    "A powerful desiccant — absorbs moisture aggressively.",
    "Reacts so violently with water it generates enough heat to boil it.",
    "danger",
    "industrial",
  ),
];

export const COMPOUND_BY_KEY: Record<string, Compound> = Object.fromEntries(COMPOUNDS.map((x) => [x.key, x]));

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

// ─── Unknown compound generation ──────────────────────────────────────────────
const isNoble = (e: ChemElement) => e.category === "noble-gas";
const isMetal = (e: ChemElement) =>
  ["alkali", "alkaline-earth", "transition", "post-transition", "lanthanide", "actinide"].includes(e.category);
const isHeavy = (e: ChemElement) => e.z > 80 && !isNoble(e);

export function generateUnknown(atoms: Record<string, number>): string {
  const els = Object.keys(atoms)
    .map((s) => ELEMENT_BY_SYMBOL[s])
    .filter(Boolean);
  const syms = new Set(Object.keys(atoms));

  if (els.some(isNoble))
    return "Highly unstable — noble gases rarely bond with anything. If forced together, this compound would decay in a fraction of a second, releasing a soft blue flash.";

  const heavy = els.find(isHeavy);
  if (heavy)
    return `Would be extraordinarily dense and almost certainly radioactive. The presence of ${heavy.name.toLowerCase()} suggests a dark, heavy solid that emits faint radiation and should never be handled without shielding.`;

  if (syms.has("C") && syms.has("H") && els.length === 2)
    return "Likely an unknown hydrocarbon — a flammable liquid or gas with a faint petrol smell, potentially useful as a fuel or solvent if it could be stabilized.";

  if (syms.has("C") && syms.has("H") && syms.has("O") && els.length === 3)
    return "Could be an exotic organic compound — possibly a sweet-smelling ester or a volatile alcohol-like substance. Many perfumes and flavors are built from exactly these three elements.";

  if (els.every((e) => isMetal(e) || syms.has("O")) && syms.has("O"))
    return "Might form an exotic metal oxide not yet synthesized — possibly a brightly coloured ceramic with interesting magnetic or optical properties, useful in electronics or catalysis.";

  if (syms.has("N") && syms.has("O"))
    return "A nitrogen oxide compound — likely a reactive gas with an acrid smell. Could be a new type of air pollutant or, if controlled, a useful propellant or oxidizer.";

  if (syms.has("S"))
    return "Contains sulfur, so it would likely have a distinctive (unpleasant) smell. Could be a new type of sulfide or sulfate with potential applications in batteries or industrial chemistry.";

  const count = Object.keys(atoms).length;
  if (count >= 4)
    return "A complex multi-element compound — its properties would depend heavily on bond geometry and electron configuration. Imagine a faintly iridescent solid that changes color under different lighting conditions.";

  return "A theoretical compound — its properties would depend on the bond geometry. Imagine a faintly silvery substance that reacts slowly with light, gradually settling into crystalline structures overnight.";
}

export function pickAnimationForUnknown(atoms: Record<string, number>): AnimationType {
  const els = Object.keys(atoms)
    .map((s) => ELEMENT_BY_SYMBOL[s])
    .filter(Boolean);
  const syms = new Set(Object.keys(atoms));
  if (els.some(isNoble)) return "glow";
  if (syms.has("C") && syms.has("H")) return "flame";
  if (syms.has("N") && syms.has("O")) return "danger";
  if (syms.has("O")) return "bubble";
  if (els.some(isMetal)) return "crystal";
  return "sparkle";
}

export function mix(atoms: Record<string, number>): MixResult | null {
  const cleaned: Record<string, number> = {};
  for (const [s, n] of Object.entries(atoms)) if (n > 0) cleaned[s] = n;
  if (Object.keys(cleaned).length === 0) return null;

  const key = hillKey(cleaned);
  const known = COMPOUND_BY_KEY[key] ?? null;

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
