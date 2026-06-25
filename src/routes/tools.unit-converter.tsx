import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, Check, ChevronDown, Copy } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/unit-converter")({
  head: () => buildToolMeta(toolBySlug("unit-converter", tools)),
  component: UnitConverterPage,
});

// ---------- Data ----------

type CategoryId =
  | "length" | "weight" | "temperature" | "area" | "volume"
  | "speed" | "time" | "data" | "pressure" | "energy";

interface Unit {
  id: string;
  label: string;
  symbol: string;
  toBase?: number; // multiplier to base unit (omitted for temperature)
}

interface QuickPair {
  from: string;
  to: string;
  value: number;
}

interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  base?: string; // base unit id
  units: Unit[];
  quick: QuickPair[];
  formula: string;
}

const CATEGORIES: Category[] = [
  {
    id: "length",
    label: "Length",
    icon: "📏",
    base: "meter",
    units: [
      { id: "meter", label: "Meter", symbol: "m", toBase: 1 },
      { id: "kilometer", label: "Kilometer", symbol: "km", toBase: 1000 },
      { id: "centimeter", label: "Centimeter", symbol: "cm", toBase: 0.01 },
      { id: "millimeter", label: "Millimeter", symbol: "mm", toBase: 0.001 },
      { id: "micrometer", label: "Micrometer", symbol: "µm", toBase: 1e-6 },
      { id: "nanometer", label: "Nanometer", symbol: "nm", toBase: 1e-9 },
      { id: "mile", label: "Mile", symbol: "mi", toBase: 1609.344 },
      { id: "yard", label: "Yard", symbol: "yd", toBase: 0.9144 },
      { id: "foot", label: "Foot", symbol: "ft", toBase: 0.3048 },
      { id: "inch", label: "Inch", symbol: "in", toBase: 0.0254 },
      { id: "nautical-mile", label: "Nautical Mile", symbol: "nmi", toBase: 1852 },
      { id: "light-year", label: "Light Year", symbol: "ly", toBase: 9.4607304725808e15 },
    ],
    quick: [
      { from: "kilometer", to: "mile", value: 1 },
      { from: "mile", to: "kilometer", value: 1 },
      { from: "inch", to: "centimeter", value: 1 },
      { from: "foot", to: "centimeter", value: 1 },
      { from: "meter", to: "foot", value: 1 },
      { from: "yard", to: "meter", value: 1 },
      { from: "centimeter", to: "inch", value: 100 },
      { from: "millimeter", to: "inch", value: 10 },
    ],
    formula: "result = value × (from.toMeter) ÷ (to.toMeter)",
  },
  {
    id: "weight",
    label: "Weight",
    icon: "⚖️",
    base: "kilogram",
    units: [
      { id: "kilogram", label: "Kilogram", symbol: "kg", toBase: 1 },
      { id: "gram", label: "Gram", symbol: "g", toBase: 0.001 },
      { id: "milligram", label: "Milligram", symbol: "mg", toBase: 1e-6 },
      { id: "metric-ton", label: "Metric Ton", symbol: "t", toBase: 1000 },
      { id: "pound", label: "Pound", symbol: "lb", toBase: 0.45359237 },
      { id: "ounce", label: "Ounce", symbol: "oz", toBase: 0.028349523125 },
      { id: "stone", label: "Stone", symbol: "st", toBase: 6.35029318 },
      { id: "short-ton", label: "Short Ton (US)", symbol: "ton", toBase: 907.18474 },
      { id: "long-ton", label: "Long Ton (UK)", symbol: "lt", toBase: 1016.0469088 },
      { id: "carat", label: "Carat", symbol: "ct", toBase: 0.0002 },
    ],
    quick: [
      { from: "kilogram", to: "pound", value: 1 },
      { from: "pound", to: "kilogram", value: 1 },
      { from: "gram", to: "ounce", value: 100 },
      { from: "ounce", to: "gram", value: 1 },
      { from: "stone", to: "kilogram", value: 1 },
      { from: "metric-ton", to: "pound", value: 1 },
    ],
    formula: "result = value × (from.toKilogram) ÷ (to.toKilogram)",
  },
  {
    id: "temperature",
    label: "Temperature",
    icon: "🌡️",
    units: [
      { id: "celsius", label: "Celsius", symbol: "°C" },
      { id: "fahrenheit", label: "Fahrenheit", symbol: "°F" },
      { id: "kelvin", label: "Kelvin", symbol: "K" },
      { id: "rankine", label: "Rankine", symbol: "°R" },
    ],
    quick: [
      { from: "celsius", to: "fahrenheit", value: 0 },
      { from: "celsius", to: "fahrenheit", value: 100 },
      { from: "fahrenheit", to: "celsius", value: 32 },
      { from: "fahrenheit", to: "celsius", value: 100 },
      { from: "celsius", to: "kelvin", value: 0 },
      { from: "kelvin", to: "celsius", value: 300 },
    ],
    formula: "°F = (°C × 9/5) + 32 · K = °C + 273.15 · °R = °F + 459.67",
  },
  {
    id: "area",
    label: "Area",
    icon: "📐",
    base: "square-meter",
    units: [
      { id: "square-meter", label: "Square Meter", symbol: "m²", toBase: 1 },
      { id: "square-kilometer", label: "Square Kilometer", symbol: "km²", toBase: 1e6 },
      { id: "square-centimeter", label: "Square Centimeter", symbol: "cm²", toBase: 1e-4 },
      { id: "square-millimeter", label: "Square Millimeter", symbol: "mm²", toBase: 1e-6 },
      { id: "square-mile", label: "Square Mile", symbol: "mi²", toBase: 2589988.110336 },
      { id: "square-yard", label: "Square Yard", symbol: "yd²", toBase: 0.83612736 },
      { id: "square-foot", label: "Square Foot", symbol: "ft²", toBase: 0.09290304 },
      { id: "square-inch", label: "Square Inch", symbol: "in²", toBase: 0.00064516 },
      { id: "hectare", label: "Hectare", symbol: "ha", toBase: 10000 },
      { id: "acre", label: "Acre", symbol: "ac", toBase: 4046.8564224 },
    ],
    quick: [
      { from: "square-meter", to: "square-foot", value: 1 },
      { from: "hectare", to: "acre", value: 1 },
      { from: "acre", to: "square-meter", value: 1 },
      { from: "square-kilometer", to: "square-mile", value: 1 },
      { from: "square-foot", to: "square-meter", value: 100 },
      { from: "square-inch", to: "square-centimeter", value: 1 },
    ],
    formula: "result = value × (from.toSquareMeter) ÷ (to.toSquareMeter)",
  },
  {
    id: "volume",
    label: "Volume",
    icon: "🧪",
    base: "liter",
    units: [
      { id: "liter", label: "Liter", symbol: "L", toBase: 1 },
      { id: "milliliter", label: "Milliliter", symbol: "mL", toBase: 0.001 },
      { id: "cubic-meter", label: "Cubic Meter", symbol: "m³", toBase: 1000 },
      { id: "cubic-centimeter", label: "Cubic Centimeter", symbol: "cm³", toBase: 0.001 },
      { id: "gallon-us", label: "Gallon (US)", symbol: "gal", toBase: 3.785411784 },
      { id: "gallon-uk", label: "Gallon (UK)", symbol: "gal UK", toBase: 4.54609 },
      { id: "quart-us", label: "Quart (US)", symbol: "qt", toBase: 0.946352946 },
      { id: "pint-us", label: "Pint (US)", symbol: "pt", toBase: 0.473176473 },
      { id: "cup-us", label: "Cup (US)", symbol: "cup", toBase: 0.2365882365 },
      { id: "fluid-ounce-us", label: "Fluid Ounce (US)", symbol: "fl oz", toBase: 0.0295735295625 },
      { id: "tablespoon", label: "Tablespoon", symbol: "tbsp", toBase: 0.01478676478125 },
      { id: "teaspoon", label: "Teaspoon", symbol: "tsp", toBase: 0.00492892159375 },
      { id: "cubic-foot", label: "Cubic Foot", symbol: "ft³", toBase: 28.316846592 },
      { id: "cubic-inch", label: "Cubic Inch", symbol: "in³", toBase: 0.016387064 },
    ],
    quick: [
      { from: "liter", to: "gallon-us", value: 1 },
      { from: "gallon-us", to: "liter", value: 1 },
      { from: "milliliter", to: "fluid-ounce-us", value: 100 },
      { from: "cup-us", to: "milliliter", value: 1 },
      { from: "tablespoon", to: "milliliter", value: 1 },
      { from: "cubic-meter", to: "gallon-us", value: 1 },
    ],
    formula: "result = value × (from.toLiter) ÷ (to.toLiter)",
  },
  {
    id: "speed",
    label: "Speed",
    icon: "🚀",
    base: "meter-per-second",
    units: [
      { id: "meter-per-second", label: "Meter / Second", symbol: "m/s", toBase: 1 },
      { id: "kilometer-per-hour", label: "Kilometer / Hour", symbol: "km/h", toBase: 1 / 3.6 },
      { id: "mile-per-hour", label: "Mile / Hour", symbol: "mph", toBase: 0.44704 },
      { id: "knot", label: "Knot", symbol: "kn", toBase: 0.514444 },
      { id: "foot-per-second", label: "Foot / Second", symbol: "ft/s", toBase: 0.3048 },
      { id: "mach", label: "Mach", symbol: "Ma", toBase: 343 },
    ],
    quick: [
      { from: "kilometer-per-hour", to: "mile-per-hour", value: 100 },
      { from: "mile-per-hour", to: "kilometer-per-hour", value: 60 },
      { from: "knot", to: "kilometer-per-hour", value: 1 },
      { from: "meter-per-second", to: "kilometer-per-hour", value: 1 },
      { from: "mach", to: "kilometer-per-hour", value: 1 },
      { from: "foot-per-second", to: "meter-per-second", value: 1 },
    ],
    formula: "result = value × (from.toMetersPerSecond) ÷ (to.toMetersPerSecond)",
  },
  {
    id: "time",
    label: "Time",
    icon: "⏱️",
    base: "second",
    units: [
      { id: "second", label: "Second", symbol: "s", toBase: 1 },
      { id: "millisecond", label: "Millisecond", symbol: "ms", toBase: 0.001 },
      { id: "microsecond", label: "Microsecond", symbol: "µs", toBase: 1e-6 },
      { id: "nanosecond", label: "Nanosecond", symbol: "ns", toBase: 1e-9 },
      { id: "minute", label: "Minute", symbol: "min", toBase: 60 },
      { id: "hour", label: "Hour", symbol: "h", toBase: 3600 },
      { id: "day", label: "Day", symbol: "d", toBase: 86400 },
      { id: "week", label: "Week", symbol: "wk", toBase: 604800 },
      { id: "month", label: "Month (30d)", symbol: "mo", toBase: 2592000 },
      { id: "year", label: "Year (365d)", symbol: "yr", toBase: 31536000 },
      { id: "decade", label: "Decade", symbol: "dec", toBase: 315360000 },
      { id: "century", label: "Century", symbol: "c", toBase: 3153600000 },
    ],
    quick: [
      { from: "hour", to: "minute", value: 1 },
      { from: "day", to: "hour", value: 1 },
      { from: "week", to: "day", value: 1 },
      { from: "year", to: "day", value: 1 },
      { from: "minute", to: "second", value: 5 },
      { from: "century", to: "year", value: 1 },
    ],
    formula: "result = value × (from.toSeconds) ÷ (to.toSeconds)",
  },
  {
    id: "data",
    label: "Data",
    icon: "💾",
    base: "byte",
    units: [
      { id: "bit", label: "Bit", symbol: "b", toBase: 1 / 8 },
      { id: "byte", label: "Byte", symbol: "B", toBase: 1 },
      { id: "kilobyte", label: "Kilobyte (SI)", symbol: "KB", toBase: 1000 },
      { id: "megabyte", label: "Megabyte (SI)", symbol: "MB", toBase: 1e6 },
      { id: "gigabyte", label: "Gigabyte (SI)", symbol: "GB", toBase: 1e9 },
      { id: "terabyte", label: "Terabyte (SI)", symbol: "TB", toBase: 1e12 },
      { id: "petabyte", label: "Petabyte (SI)", symbol: "PB", toBase: 1e15 },
      { id: "kibibyte", label: "Kibibyte (binary)", symbol: "KiB", toBase: 1024 },
      { id: "mebibyte", label: "Mebibyte (binary)", symbol: "MiB", toBase: 1024 ** 2 },
      { id: "gibibyte", label: "Gibibyte (binary)", symbol: "GiB", toBase: 1024 ** 3 },
    ],
    quick: [
      { from: "megabyte", to: "gigabyte", value: 1024 },
      { from: "gigabyte", to: "megabyte", value: 1 },
      { from: "kilobyte", to: "kibibyte", value: 1 },
      { from: "mebibyte", to: "megabyte", value: 1 },
      { from: "byte", to: "bit", value: 1 },
      { from: "terabyte", to: "gigabyte", value: 1 },
    ],
    formula: "result = value × (from.toBytes) ÷ (to.toBytes) · 1 KiB = 1024 B, 1 KB = 1000 B",
  },
  {
    id: "pressure",
    label: "Pressure",
    icon: "🔧",
    base: "pascal",
    units: [
      { id: "pascal", label: "Pascal", symbol: "Pa", toBase: 1 },
      { id: "kilopascal", label: "Kilopascal", symbol: "kPa", toBase: 1000 },
      { id: "megapascal", label: "Megapascal", symbol: "MPa", toBase: 1e6 },
      { id: "bar", label: "Bar", symbol: "bar", toBase: 100000 },
      { id: "millibar", label: "Millibar", symbol: "mbar", toBase: 100 },
      { id: "atmosphere", label: "Atmosphere", symbol: "atm", toBase: 101325 },
      { id: "psi", label: "Pounds / Square Inch", symbol: "psi", toBase: 6894.757293168 },
      { id: "torr", label: "Torr", symbol: "Torr", toBase: 133.32236842105 },
      { id: "mmhg", label: "Millimeter of Mercury", symbol: "mmHg", toBase: 133.322387415 },
    ],
    quick: [
      { from: "bar", to: "psi", value: 1 },
      { from: "psi", to: "bar", value: 1 },
      { from: "atmosphere", to: "pascal", value: 1 },
      { from: "kilopascal", to: "psi", value: 100 },
      { from: "mmhg", to: "kilopascal", value: 760 },
      { from: "bar", to: "atmosphere", value: 1 },
    ],
    formula: "result = value × (from.toPascal) ÷ (to.toPascal)",
  },
  {
    id: "energy",
    label: "Energy",
    icon: "⚡",
    base: "joule",
    units: [
      { id: "joule", label: "Joule", symbol: "J", toBase: 1 },
      { id: "kilojoule", label: "Kilojoule", symbol: "kJ", toBase: 1000 },
      { id: "megajoule", label: "Megajoule", symbol: "MJ", toBase: 1e6 },
      { id: "calorie", label: "Calorie", symbol: "cal", toBase: 4.184 },
      { id: "kilocalorie", label: "Kilocalorie", symbol: "kcal", toBase: 4184 },
      { id: "watt-hour", label: "Watt-hour", symbol: "Wh", toBase: 3600 },
      { id: "kilowatt-hour", label: "Kilowatt-hour", symbol: "kWh", toBase: 3.6e6 },
      { id: "electronvolt", label: "Electronvolt", symbol: "eV", toBase: 1.602176634e-19 },
      { id: "btu", label: "British Thermal Unit", symbol: "BTU", toBase: 1055.05585262 },
      { id: "therm", label: "Therm", symbol: "thm", toBase: 105505585.262 },
    ],
    quick: [
      { from: "kilowatt-hour", to: "megajoule", value: 1 },
      { from: "kilocalorie", to: "kilojoule", value: 1 },
      { from: "btu", to: "joule", value: 1 },
      { from: "calorie", to: "joule", value: 100 },
      { from: "joule", to: "electronvolt", value: 1 },
      { from: "therm", to: "kilowatt-hour", value: 1 },
    ],
    formula: "result = value × (from.toJoule) ÷ (to.toJoule)",
  },
];

const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

// ---------- Conversion ----------

function tempToCelsius(value: number, from: string): number {
  switch (from) {
    case "celsius": return value;
    case "fahrenheit": return (value - 32) * (5 / 9);
    case "kelvin": return value - 273.15;
    case "rankine": return (value - 491.67) * (5 / 9);
    default: return value;
  }
}

function celsiusTo(value: number, to: string): number {
  switch (to) {
    case "celsius": return value;
    case "fahrenheit": return value * (9 / 5) + 32;
    case "kelvin": return value + 273.15;
    case "rankine": return (value + 273.15) * (9 / 5);
    default: return value;
  }
}

function convert(value: number, from: string, to: string, cat: Category): number {
  if (!isFinite(value)) return NaN;
  if (from === to) return value;
  if (cat.id === "temperature") {
    return celsiusTo(tempToCelsius(value, from), to);
  }
  const f = cat.units.find((u) => u.id === from);
  const t = cat.units.find((u) => u.id === to);
  if (!f || !t || !f.toBase || !t.toBase) return NaN;
  return (value * f.toBase) / t.toBase;
}

function formatResult(n: number): string {
  if (!isFinite(n)) return "";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e10 || abs < 1e-6) {
    return n.toExponential(6).replace(/\.?0+e/, "e");
  }
  return Number(n.toPrecision(8)).toString();
}

// ---------- Component ----------

interface RecentEntry {
  cat: CategoryId;
  from: string;
  to: string;
  val: string;
  result: string;
}

function readInitialState() {
  if (typeof window === "undefined") {
    return { cat: "length" as CategoryId, from: "meter", to: "kilometer", val: "1" };
  }
  const params = new URLSearchParams(window.location.search);
  const cat = (params.get("cat") as CategoryId) || "length";
  const category = CATEGORY_MAP[cat] || CATEGORY_MAP.length;
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const from = category.units.find((u) => u.id === fromParam)?.id || category.units[0].id;
  const to = category.units.find((u) => u.id === toParam)?.id || category.units[1]?.id || category.units[0].id;
  const val = params.get("val") ?? "1";
  return { cat: category.id, from, to, val };
}

function UnitConverterPage() {
  const initial = useMemo(readInitialState, []);
  const [categoryId, setCategoryId] = useState<CategoryId>(initial.cat);
  const [fromUnit, setFromUnit] = useState<string>(initial.from);
  const [toUnit, setToUnit] = useState<string>(initial.to);
  const [fromValue, setFromValue] = useState<string>(initial.val);
  const [toValue, setToValue] = useState<string>("");
  const [lastEdited, setLastEdited] = useState<"from" | "to">("from");
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [swapTurn, setSwapTurn] = useState(0);
  const debounceRef = useRef<number | null>(null);

  const category = CATEGORY_MAP[categoryId];
  const fromUnitDef = category.units.find((u) => u.id === fromUnit) || category.units[0];
  const toUnitDef = category.units.find((u) => u.id === toUnit) || category.units[1] || category.units[0];

  // Load recent from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("unit-converter-history");
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Recompute the opposite side whenever inputs change
  useEffect(() => {
    if (lastEdited === "from") {
      if (fromValue.trim() === "" || fromValue === "-") {
        setToValue("");
        return;
      }
      const n = Number(fromValue);
      if (!isFinite(n)) {
        setToValue("");
        return;
      }
      setToValue(formatResult(convert(n, fromUnit, toUnit, category)));
    } else {
      if (toValue.trim() === "" || toValue === "-") {
        setFromValue("");
        return;
      }
      const n = Number(toValue);
      if (!isFinite(n)) {
        setFromValue("");
        return;
      }
      setFromValue(formatResult(convert(n, toUnit, fromUnit, category)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromValue, toValue, fromUnit, toUnit, categoryId]);

  // Sync URL + save recent (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("cat", categoryId);
    params.set("from", fromUnit);
    params.set("to", toUnit);
    if (fromValue) params.set("val", fromValue);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (!fromValue || !toValue) return;
      setRecent((prev) => {
        const entry: RecentEntry = { cat: categoryId, from: fromUnit, to: toUnit, val: fromValue, result: toValue };
        const last = prev[0];
        if (last && last.cat === entry.cat && last.from === entry.from && last.to === entry.to && last.val === entry.val) {
          return prev;
        }
        const next = [entry, ...prev.filter((r) => !(r.cat === entry.cat && r.from === entry.from && r.to === entry.to && r.val === entry.val))].slice(0, 5);
        try { localStorage.setItem("unit-converter-history", JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }, 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, fromUnit, toUnit, fromValue, toValue]);

  const handleCategoryChange = (id: CategoryId) => {
    const next = CATEGORY_MAP[id];
    setCategoryId(id);
    setFromUnit(next.units[0].id);
    setToUnit(next.units[1]?.id || next.units[0].id);
    setFromValue("1");
    setLastEdited("from");
  };

  const handleSwap = () => {
    setSwapTurn((t) => t + 1);
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setLastEdited("from");
  };

  const handleQuickChip = (q: QuickPair) => {
    setFromUnit(q.from);
    setToUnit(q.to);
    setFromValue(String(q.value));
    setLastEdited("from");
  };

  const handleRestoreRecent = (r: RecentEntry) => {
    setCategoryId(r.cat);
    setFromUnit(r.from);
    setToUnit(r.to);
    setFromValue(r.val);
    setLastEdited("from");
  };

  const handleCopy = async () => {
    const text = `${fromValue} ${fromUnitDef.symbol} = ${toValue} ${toUnitDef.symbol}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <ToolPageShell
      title="Unit Converter"
      description="Convert length, weight, temperature, area, volume, speed, time, data, pressure and energy units instantly."
    >
      {/* Category tabs */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <div className="flex sm:flex-wrap gap-2 pb-2 min-w-max sm:min-w-0">
          {CATEGORIES.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(c.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-[color:var(--cyan-brand)] text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
                style={
                  active
                    ? {
                        background: "color-mix(in oklab, var(--cyan-brand) 15%, transparent)",
                        boxShadow: "0 0 20px rgba(0,212,255,0.25)",
                      }
                    : undefined
                }
              >
                <span aria-hidden>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Converter card */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          {/* FROM */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">From</label>
            <Select value={fromUnit} onValueChange={(v) => { setFromUnit(v); setLastEdited("from"); }}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label} ({u.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={fromValue}
              inputMode="decimal"
              onChange={(e) => { setFromValue(e.target.value); setLastEdited("from"); }}
              className="h-14 text-3xl font-mono tabular-nums"
              placeholder="0"
              aria-label={`Value in ${fromUnitDef.label}`}
            />
          </div>

          {/* Swap */}
          <div className="flex sm:flex-col items-center justify-center sm:pb-2">
            <motion.button
              type="button"
              onClick={handleSwap}
              animate={{ rotate: swapTurn * 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-12 h-12 rounded-full border border-border bg-background hover:border-[color:var(--cyan-brand)] hover:text-[color:var(--cyan-brand)] inline-flex items-center justify-center transition-colors"
              aria-label="Swap units"
              title="Swap units"
            >
              <ArrowDownUp className="w-5 h-5" />
            </motion.button>
          </div>

          {/* TO */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">To</label>
            <Select value={toUnit} onValueChange={(v) => { setToUnit(v); setLastEdited("from"); }}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {category.units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label} ({u.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                value={toValue}
                inputMode="decimal"
                onChange={(e) => { setToValue(e.target.value); setLastEdited("to"); }}
                className="h-14 text-3xl font-mono tabular-nums pr-12"
                placeholder="0"
                aria-label={`Value in ${toUnitDef.label}`}
                style={{ color: "var(--cyan-brand)" }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-[color:var(--cyan-brand)] transition-colors"
                aria-label="Copy result"
                title="Copy result"
              >
                {copied ? <Check className="w-4 h-4" style={{ color: "var(--green-brand)" }} /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick conversions */}
        <div className="mt-7">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Quick conversions</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {category.quick.map((q, i) => {
              const f = category.units.find((u) => u.id === q.from);
              const t = category.units.find((u) => u.id === q.to);
              if (!f || !t) return null;
              const result = formatResult(convert(q.value, q.from, q.to, category));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickChip(q)}
                  className="rounded-lg border border-border bg-background/50 px-3 py-2 text-left text-xs hover:border-[color:var(--cyan-brand)] hover:text-foreground transition-colors"
                >
                  <span className="text-foreground font-medium">{q.value} {f.symbol}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span style={{ color: "var(--cyan-brand)" }}>{result} {t.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formula */}
        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setFormulaOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${formulaOpen ? "rotate-180" : ""}`} />
            {formulaOpen ? "Hide formula" : "Show formula"}
          </button>
          {formulaOpen && (
            <p className="mt-2 text-xs text-muted-foreground font-mono leading-relaxed">{category.formula}</p>
          )}
        </div>

        {/* Recent */}
        {recent.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Recent</div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r, i) => {
                const cat = CATEGORY_MAP[r.cat];
                const f = cat?.units.find((u) => u.id === r.from);
                const t = cat?.units.find((u) => u.id === r.to);
                if (!cat || !f || !t) return null;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRestoreRecent(r)}
                    className="rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-[color:var(--cyan-brand)] transition-colors"
                  >
                    {r.val} {f.symbol} → {r.result} {t.symbol}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AdZone id="unit-converter-mid" size="728x90" />

      <HowToUse
        steps={[
          "Select a category: Length, Weight, Temperature, Area, Volume, Speed, Time, Data, Pressure, or Energy.",
          "Choose FROM and TO units, then type a value — result updates instantly.",
          "Click Copy to copy the full result, or tap a Quick Conversion chip to load a popular pair.",
        ]}
      />

      <ToolSeoContent
        title="Free Unit Converter — Convert Length, Weight, Temperature & More Online"
        description="Convert between 100+ units across 10 categories. Free, instant, no signup."
        body={[
          "Skycally's Unit Converter covers 10 categories and 100+ units in one clean interface. Select a category, pick units, type a value, get the result instantly — no button, no reload, no signup.",
          "The most searched conversions are all here: km to miles, kg to pounds, Celsius to Fahrenheit, liters to gallons, square meters to square feet, megabytes to gigabytes.",
          "Temperature uses precise formulas — not approximations — covering Celsius, Fahrenheit, Kelvin, and Rankine. Data storage includes both SI (KB=1000B) and binary (KiB=1024B) units, clearly labeled.",
          "All conversions run in your browser. The URL updates automatically for bookmarking or sharing. Recent conversions are saved locally for quick access.",
        ]}
        faqs={[
          { question: "How many unit categories are supported?", answer: "10 categories: Length, Weight/Mass, Temperature, Area, Volume, Speed, Time, Data Storage, Pressure, and Energy — covering 100+ units." },
          { question: "How is temperature conversion different?", answer: "Temperature uses mathematical formulas not multipliers. Celsius to Fahrenheit is (°C × 9/5) + 32. Covers Celsius, Fahrenheit, Kelvin, and Rankine." },
          { question: "What is the difference between KB and KiB?", answer: "KB = 1,000 bytes (SI standard). KiB = 1,024 bytes (binary standard used by operating systems). Both are included and clearly labeled." },
          { question: "Can I convert in both directions?", answer: "Yes. Both FROM and TO fields are editable. Type in either and the other updates instantly. Use the swap button to flip units." },
          { question: "Does the tool save recent conversions?", answer: "Yes. Last 5 conversions are saved in localStorage and shown in a Recent section for quick access." },
          { question: "Can I share a specific conversion?", answer: "Yes. The URL updates with your current category, units, and value. Copy the URL to share or bookmark any conversion." },
          { question: "Is the converter accurate?", answer: "Yes. Uses standardized scientific conversion factors, displays up to 8 significant digits, with scientific notation for very large/small numbers." },
          { question: "Does this work on mobile?", answer: "Yes. Large touch targets, numeric keyboard, horizontal scrolling tabs — fully optimized for smartphones." },
        ]}
      />

      <RelatedTools currentSlug="unit-converter" />
    </ToolPageShell>
  );
}
