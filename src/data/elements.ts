export type ElementCategory =
  | "nonmetal"
  | "noble-gas"
  | "alkali"
  | "alkaline-earth"
  | "metalloid"
  | "halogen"
  | "post-transition"
  | "transition"
  | "lanthanide"
  | "actinide";

export interface ChemElement {
  z: number;
  symbol: string;
  name: string;
  mass: number;
  category: ElementCategory;
  /** Grid period (row 1-7 for main, 9 for lanthanides, 10 for actinides). */
  period: number;
  /** Grid group/column 1-18. */
  group: number;
  examples?: string;
}

// 118 elements with periodic-table grid placement.
// Lanthanides (La-Lu) live on row 9, columns 3-17.
// Actinides (Ac-Lr) live on row 10, columns 3-17.
export const ELEMENTS: ChemElement[] = [
  { z: 1, symbol: "H", name: "Hydrogen", mass: 1.008, category: "nonmetal", period: 1, group: 1, examples: "Water, fuel cells, stars" },
  { z: 2, symbol: "He", name: "Helium", mass: 4.003, category: "noble-gas", period: 1, group: 18, examples: "Balloons, MRI cooling" },
  { z: 3, symbol: "Li", name: "Lithium", mass: 6.94, category: "alkali", period: 2, group: 1, examples: "Batteries, mood medicine" },
  { z: 4, symbol: "Be", name: "Beryllium", mass: 9.012, category: "alkaline-earth", period: 2, group: 2, examples: "Aerospace alloys" },
  { z: 5, symbol: "B", name: "Boron", mass: 10.81, category: "metalloid", period: 2, group: 13, examples: "Pyrex glass, detergents" },
  { z: 6, symbol: "C", name: "Carbon", mass: 12.01, category: "nonmetal", period: 2, group: 14, examples: "Life, diamonds, graphite" },
  { z: 7, symbol: "N", name: "Nitrogen", mass: 14.01, category: "nonmetal", period: 2, group: 15, examples: "Air (78%), fertilizers" },
  { z: 8, symbol: "O", name: "Oxygen", mass: 16.0, category: "nonmetal", period: 2, group: 16, examples: "Breathing, water, fire" },
  { z: 9, symbol: "F", name: "Fluorine", mass: 19.0, category: "halogen", period: 2, group: 17, examples: "Toothpaste, Teflon" },
  { z: 10, symbol: "Ne", name: "Neon", mass: 20.18, category: "noble-gas", period: 2, group: 18, examples: "Neon signs" },
  { z: 11, symbol: "Na", name: "Sodium", mass: 22.99, category: "alkali", period: 3, group: 1, examples: "Table salt, street lamps" },
  { z: 12, symbol: "Mg", name: "Magnesium", mass: 24.31, category: "alkaline-earth", period: 3, group: 2, examples: "Fireworks, chlorophyll" },
  { z: 13, symbol: "Al", name: "Aluminum", mass: 26.98, category: "post-transition", period: 3, group: 13, examples: "Foil, cans, planes" },
  { z: 14, symbol: "Si", name: "Silicon", mass: 28.09, category: "metalloid", period: 3, group: 14, examples: "Computer chips, sand" },
  { z: 15, symbol: "P", name: "Phosphorus", mass: 30.97, category: "nonmetal", period: 3, group: 15, examples: "Matches, DNA, bones" },
  { z: 16, symbol: "S", name: "Sulfur", mass: 32.06, category: "nonmetal", period: 3, group: 16, examples: "Gunpowder, volcanoes" },
  { z: 17, symbol: "Cl", name: "Chlorine", mass: 35.45, category: "halogen", period: 3, group: 17, examples: "Bleach, pool sanitiser" },
  { z: 18, symbol: "Ar", name: "Argon", mass: 39.95, category: "noble-gas", period: 3, group: 18, examples: "Light bulbs, welding" },
  { z: 19, symbol: "K", name: "Potassium", mass: 39.1, category: "alkali", period: 4, group: 1, examples: "Bananas, fertilizers" },
  { z: 20, symbol: "Ca", name: "Calcium", mass: 40.08, category: "alkaline-earth", period: 4, group: 2, examples: "Bones, milk, chalk" },
  { z: 21, symbol: "Sc", name: "Scandium", mass: 44.96, category: "transition", period: 4, group: 3, examples: "Lightweight bike frames" },
  { z: 22, symbol: "Ti", name: "Titanium", mass: 47.87, category: "transition", period: 4, group: 4, examples: "Implants, jets, paint" },
  { z: 23, symbol: "V", name: "Vanadium", mass: 50.94, category: "transition", period: 4, group: 5, examples: "Tool steel" },
  { z: 24, symbol: "Cr", name: "Chromium", mass: 52.0, category: "transition", period: 4, group: 6, examples: "Stainless steel, chrome plating" },
  { z: 25, symbol: "Mn", name: "Manganese", mass: 54.94, category: "transition", period: 4, group: 7, examples: "Steel, batteries" },
  { z: 26, symbol: "Fe", name: "Iron", mass: 55.85, category: "transition", period: 4, group: 8, examples: "Steel, blood haemoglobin" },
  { z: 27, symbol: "Co", name: "Cobalt", mass: 58.93, category: "transition", period: 4, group: 9, examples: "Magnets, blue pigments" },
  { z: 28, symbol: "Ni", name: "Nickel", mass: 58.69, category: "transition", period: 4, group: 10, examples: "Coins, batteries" },
  { z: 29, symbol: "Cu", name: "Copper", mass: 63.55, category: "transition", period: 4, group: 11, examples: "Wires, pipes, bronze" },
  { z: 30, symbol: "Zn", name: "Zinc", mass: 65.38, category: "transition", period: 4, group: 12, examples: "Galvanising, sunscreen" },
  { z: 31, symbol: "Ga", name: "Gallium", mass: 69.72, category: "post-transition", period: 4, group: 13, examples: "Semiconductors, LEDs" },
  { z: 32, symbol: "Ge", name: "Germanium", mass: 72.63, category: "metalloid", period: 4, group: 14, examples: "Fiber optics, transistors" },
  { z: 33, symbol: "As", name: "Arsenic", mass: 74.92, category: "metalloid", period: 4, group: 15, examples: "Semiconductors (toxic!)" },
  { z: 34, symbol: "Se", name: "Selenium", mass: 78.97, category: "nonmetal", period: 4, group: 16, examples: "Solar cells, dandruff shampoo" },
  { z: 35, symbol: "Br", name: "Bromine", mass: 79.9, category: "halogen", period: 4, group: 17, examples: "Flame retardants" },
  { z: 36, symbol: "Kr", name: "Krypton", mass: 83.8, category: "noble-gas", period: 4, group: 18, examples: "High-intensity lamps" },
  { z: 37, symbol: "Rb", name: "Rubidium", mass: 85.47, category: "alkali", period: 5, group: 1, examples: "Atomic clocks" },
  { z: 38, symbol: "Sr", name: "Strontium", mass: 87.62, category: "alkaline-earth", period: 5, group: 2, examples: "Red fireworks" },
  { z: 39, symbol: "Y", name: "Yttrium", mass: 88.91, category: "transition", period: 5, group: 3, examples: "Phosphors, LEDs" },
  { z: 40, symbol: "Zr", name: "Zirconium", mass: 91.22, category: "transition", period: 5, group: 4, examples: "Nuclear reactors, faux diamonds" },
  { z: 41, symbol: "Nb", name: "Niobium", mass: 92.91, category: "transition", period: 5, group: 5, examples: "Superconductors" },
  { z: 42, symbol: "Mo", name: "Molybdenum", mass: 95.95, category: "transition", period: 5, group: 6, examples: "Steel alloys" },
  { z: 43, symbol: "Tc", name: "Technetium", mass: 98, category: "transition", period: 5, group: 7, examples: "Medical imaging" },
  { z: 44, symbol: "Ru", name: "Ruthenium", mass: 101.07, category: "transition", period: 5, group: 8, examples: "Hard-disk coatings" },
  { z: 45, symbol: "Rh", name: "Rhodium", mass: 102.91, category: "transition", period: 5, group: 9, examples: "Catalytic converters" },
  { z: 46, symbol: "Pd", name: "Palladium", mass: 106.42, category: "transition", period: 5, group: 10, examples: "Catalysts, jewelry" },
  { z: 47, symbol: "Ag", name: "Silver", mass: 107.87, category: "transition", period: 5, group: 11, examples: "Mirrors, jewelry, electronics" },
  { z: 48, symbol: "Cd", name: "Cadmium", mass: 112.41, category: "transition", period: 5, group: 12, examples: "Rechargeable batteries" },
  { z: 49, symbol: "In", name: "Indium", mass: 114.82, category: "post-transition", period: 5, group: 13, examples: "Touchscreens" },
  { z: 50, symbol: "Sn", name: "Tin", mass: 118.71, category: "post-transition", period: 5, group: 14, examples: "Solder, bronze, cans" },
  { z: 51, symbol: "Sb", name: "Antimony", mass: 121.76, category: "metalloid", period: 5, group: 15, examples: "Flame retardants" },
  { z: 52, symbol: "Te", name: "Tellurium", mass: 127.6, category: "metalloid", period: 5, group: 16, examples: "Solar panels" },
  { z: 53, symbol: "I", name: "Iodine", mass: 126.9, category: "halogen", period: 5, group: 17, examples: "Antiseptic, table salt" },
  { z: 54, symbol: "Xe", name: "Xenon", mass: 131.29, category: "noble-gas", period: 5, group: 18, examples: "Car headlights, ion thrusters" },
  { z: 55, symbol: "Cs", name: "Cesium", mass: 132.91, category: "alkali", period: 6, group: 1, examples: "Atomic clocks" },
  { z: 56, symbol: "Ba", name: "Barium", mass: 137.33, category: "alkaline-earth", period: 6, group: 2, examples: "Green fireworks, X-ray imaging" },
  { z: 57, symbol: "La", name: "Lanthanum", mass: 138.91, category: "lanthanide", period: 9, group: 3, examples: "Camera lenses" },
  { z: 58, symbol: "Ce", name: "Cerium", mass: 140.12, category: "lanthanide", period: 9, group: 4, examples: "Lighter flints" },
  { z: 59, symbol: "Pr", name: "Praseodymium", mass: 140.91, category: "lanthanide", period: 9, group: 5, examples: "Welding goggles" },
  { z: 60, symbol: "Nd", name: "Neodymium", mass: 144.24, category: "lanthanide", period: 9, group: 6, examples: "Strong magnets" },
  { z: 61, symbol: "Pm", name: "Promethium", mass: 145, category: "lanthanide", period: 9, group: 7, examples: "Luminous paint" },
  { z: 62, symbol: "Sm", name: "Samarium", mass: 150.36, category: "lanthanide", period: 9, group: 8, examples: "Headphone magnets" },
  { z: 63, symbol: "Eu", name: "Europium", mass: 151.96, category: "lanthanide", period: 9, group: 9, examples: "Red TV phosphors" },
  { z: 64, symbol: "Gd", name: "Gadolinium", mass: 157.25, category: "lanthanide", period: 9, group: 10, examples: "MRI contrast" },
  { z: 65, symbol: "Tb", name: "Terbium", mass: 158.93, category: "lanthanide", period: 9, group: 11, examples: "Fluorescent lamps" },
  { z: 66, symbol: "Dy", name: "Dysprosium", mass: 162.5, category: "lanthanide", period: 9, group: 12, examples: "EV motors" },
  { z: 67, symbol: "Ho", name: "Holmium", mass: 164.93, category: "lanthanide", period: 9, group: 13, examples: "Lasers" },
  { z: 68, symbol: "Er", name: "Erbium", mass: 167.26, category: "lanthanide", period: 9, group: 14, examples: "Fiber-optic amplifiers" },
  { z: 69, symbol: "Tm", name: "Thulium", mass: 168.93, category: "lanthanide", period: 9, group: 15, examples: "Portable X-ray sources" },
  { z: 70, symbol: "Yb", name: "Ytterbium", mass: 173.05, category: "lanthanide", period: 9, group: 16, examples: "Atomic clocks" },
  { z: 71, symbol: "Lu", name: "Lutetium", mass: 174.97, category: "lanthanide", period: 9, group: 17, examples: "Cancer therapy" },
  { z: 72, symbol: "Hf", name: "Hafnium", mass: 178.49, category: "transition", period: 6, group: 4, examples: "Nuclear control rods" },
  { z: 73, symbol: "Ta", name: "Tantalum", mass: 180.95, category: "transition", period: 6, group: 5, examples: "Phone capacitors" },
  { z: 74, symbol: "W", name: "Tungsten", mass: 183.84, category: "transition", period: 6, group: 6, examples: "Light-bulb filaments" },
  { z: 75, symbol: "Re", name: "Rhenium", mass: 186.21, category: "transition", period: 6, group: 7, examples: "Jet engines" },
  { z: 76, symbol: "Os", name: "Osmium", mass: 190.23, category: "transition", period: 6, group: 8, examples: "Densest natural element" },
  { z: 77, symbol: "Ir", name: "Iridium", mass: 192.22, category: "transition", period: 6, group: 9, examples: "Spark plugs" },
  { z: 78, symbol: "Pt", name: "Platinum", mass: 195.08, category: "transition", period: 6, group: 10, examples: "Catalytic converters, jewelry" },
  { z: 79, symbol: "Au", name: "Gold", mass: 196.97, category: "transition", period: 6, group: 11, examples: "Jewelry, electronics" },
  { z: 80, symbol: "Hg", name: "Mercury", mass: 200.59, category: "transition", period: 6, group: 12, examples: "Thermometers (old)" },
  { z: 81, symbol: "Tl", name: "Thallium", mass: 204.38, category: "post-transition", period: 6, group: 13, examples: "Infrared detectors" },
  { z: 82, symbol: "Pb", name: "Lead", mass: 207.2, category: "post-transition", period: 6, group: 14, examples: "Batteries, radiation shielding" },
  { z: 83, symbol: "Bi", name: "Bismuth", mass: 208.98, category: "post-transition", period: 6, group: 15, examples: "Pepto-Bismol" },
  { z: 84, symbol: "Po", name: "Polonium", mass: 209, category: "metalloid", period: 6, group: 16, examples: "Highly radioactive" },
  { z: 85, symbol: "At", name: "Astatine", mass: 210, category: "halogen", period: 6, group: 17, examples: "Rarest natural element" },
  { z: 86, symbol: "Rn", name: "Radon", mass: 222, category: "noble-gas", period: 6, group: 18, examples: "Radioactive basement gas" },
  { z: 87, symbol: "Fr", name: "Francium", mass: 223, category: "alkali", period: 7, group: 1, examples: "Extremely rare" },
  { z: 88, symbol: "Ra", name: "Radium", mass: 226, category: "alkaline-earth", period: 7, group: 2, examples: "Historic glow paint" },
  { z: 89, symbol: "Ac", name: "Actinium", mass: 227, category: "actinide", period: 10, group: 3 },
  { z: 90, symbol: "Th", name: "Thorium", mass: 232.04, category: "actinide", period: 10, group: 4, examples: "Future nuclear fuel" },
  { z: 91, symbol: "Pa", name: "Protactinium", mass: 231.04, category: "actinide", period: 10, group: 5 },
  { z: 92, symbol: "U", name: "Uranium", mass: 238.03, category: "actinide", period: 10, group: 6, examples: "Nuclear fuel" },
  { z: 93, symbol: "Np", name: "Neptunium", mass: 237, category: "actinide", period: 10, group: 7 },
  { z: 94, symbol: "Pu", name: "Plutonium", mass: 244, category: "actinide", period: 10, group: 8, examples: "Nuclear weapons" },
  { z: 95, symbol: "Am", name: "Americium", mass: 243, category: "actinide", period: 10, group: 9, examples: "Smoke detectors" },
  { z: 96, symbol: "Cm", name: "Curium", mass: 247, category: "actinide", period: 10, group: 10 },
  { z: 97, symbol: "Bk", name: "Berkelium", mass: 247, category: "actinide", period: 10, group: 11 },
  { z: 98, symbol: "Cf", name: "Californium", mass: 251, category: "actinide", period: 10, group: 12 },
  { z: 99, symbol: "Es", name: "Einsteinium", mass: 252, category: "actinide", period: 10, group: 13 },
  { z: 100, symbol: "Fm", name: "Fermium", mass: 257, category: "actinide", period: 10, group: 14 },
  { z: 101, symbol: "Md", name: "Mendelevium", mass: 258, category: "actinide", period: 10, group: 15 },
  { z: 102, symbol: "No", name: "Nobelium", mass: 259, category: "actinide", period: 10, group: 16 },
  { z: 103, symbol: "Lr", name: "Lawrencium", mass: 266, category: "actinide", period: 10, group: 17 },
  { z: 104, symbol: "Rf", name: "Rutherfordium", mass: 267, category: "transition", period: 7, group: 4 },
  { z: 105, symbol: "Db", name: "Dubnium", mass: 268, category: "transition", period: 7, group: 5 },
  { z: 106, symbol: "Sg", name: "Seaborgium", mass: 269, category: "transition", period: 7, group: 6 },
  { z: 107, symbol: "Bh", name: "Bohrium", mass: 270, category: "transition", period: 7, group: 7 },
  { z: 108, symbol: "Hs", name: "Hassium", mass: 269, category: "transition", period: 7, group: 8 },
  { z: 109, symbol: "Mt", name: "Meitnerium", mass: 278, category: "transition", period: 7, group: 9 },
  { z: 110, symbol: "Ds", name: "Darmstadtium", mass: 281, category: "transition", period: 7, group: 10 },
  { z: 111, symbol: "Rg", name: "Roentgenium", mass: 282, category: "transition", period: 7, group: 11 },
  { z: 112, symbol: "Cn", name: "Copernicium", mass: 285, category: "transition", period: 7, group: 12 },
  { z: 113, symbol: "Nh", name: "Nihonium", mass: 286, category: "post-transition", period: 7, group: 13 },
  { z: 114, symbol: "Fl", name: "Flerovium", mass: 289, category: "post-transition", period: 7, group: 14 },
  { z: 115, symbol: "Mc", name: "Moscovium", mass: 290, category: "post-transition", period: 7, group: 15 },
  { z: 116, symbol: "Lv", name: "Livermorium", mass: 293, category: "post-transition", period: 7, group: 16 },
  { z: 117, symbol: "Ts", name: "Tennessine", mass: 290, category: "halogen", period: 7, group: 17 },
  { z: 118, symbol: "Og", name: "Oganesson", mass: 294, category: "noble-gas", period: 7, group: 18 },
];

export const ELEMENT_BY_SYMBOL: Record<string, ChemElement> = Object.fromEntries(
  ELEMENTS.map((e) => [e.symbol, e]),
);

export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  nonmetal: "#facc15",          // yellow
  "noble-gas": "#a78bfa",       // purple
  alkali: "#f87171",            // red
  "alkaline-earth": "#fb923c",  // orange
  metalloid: "#2dd4bf",         // teal
  halogen: "#4ade80",           // green
  "post-transition": "#94a3b8", // slate
  transition: "#22d3ee",        // cyan
  lanthanide: "#f472b6",        // pink
  actinide: "#e879f9",          // magenta
};

export const CATEGORY_LABEL: Record<ElementCategory, string> = {
  nonmetal: "Non-metal",
  "noble-gas": "Noble gas",
  alkali: "Alkali metal",
  "alkaline-earth": "Alkaline-earth metal",
  metalloid: "Metalloid",
  halogen: "Halogen",
  "post-transition": "Post-transition metal",
  transition: "Transition metal",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};

export type FilterId = "all" | "metals" | "nonmetals" | "noble" | "lanthanides" | "actinides";

export const METAL_CATEGORIES: ElementCategory[] = [
  "alkali",
  "alkaline-earth",
  "transition",
  "post-transition",
  "lanthanide",
  "actinide",
];

export function matchesFilter(cat: ElementCategory, f: FilterId): boolean {
  switch (f) {
    case "all": return true;
    case "metals": return METAL_CATEGORIES.includes(cat);
    case "nonmetals": return cat === "nonmetal" || cat === "halogen" || cat === "metalloid";
    case "noble": return cat === "noble-gas";
    case "lanthanides": return cat === "lanthanide";
    case "actinides": return cat === "actinide";
  }
}
