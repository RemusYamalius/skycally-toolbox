import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CITIES, cityKey, findCity, type City } from "@/lib/time-zone/cities";
import { getPartsInTz, pad2 } from "@/lib/time-zone/utils";

const RECENT_KEY = "tz-recent-cities";
const RECENT_MAX = 5;

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function saveRecent(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const cur = loadRecents().filter((k) => k !== key);
    const next = [key, ...cur].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

interface Props {
  value: City;
  onChange: (c: City) => void;
  now: Date;
  label?: string;
  excludeKeys?: string[];
}

export function CitySelect({ value, onChange, now, label, excludeKeys = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  const available = useMemo(
    () => CITIES.filter((c) => !excludeKeys.includes(cityKey(c))),
    [excludeKeys],
  );

  const popularCities = useMemo(() => available.filter((c) => c.popular), [available]);
  const recentCities = useMemo(
    () => recents.map((k) => findCity(k)).filter((c): c is City => !!c && !excludeKeys.includes(cityKey(c))),
    [recents, excludeKeys],
  );
  const otherCities = useMemo(
    () =>
      available.filter(
        (c) => !c.popular && !recents.includes(cityKey(c)),
      ),
    [available, recents],
  );

  function handleSelect(c: City) {
    saveRecent(cityKey(c));
    setRecents(loadRecents());
    onChange(c);
    setOpen(false);
  }

  const parts = getPartsInTz(now, value.timezone);

  return (
    <div className="grid gap-1.5">
      {label && (
        <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label ? `${label} — ${value.name}` : `Select city — ${value.name}`}
            className="w-full justify-between font-normal h-auto py-2.5"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none">{value.emoji}</span>
              <span className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate">{value.name}</span>
                <span className="text-[11px] text-muted-foreground truncate">{value.country}</span>
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs font-mono tabular-nums text-muted-foreground">
                {pad2(parts.hour)}:{pad2(parts.minute)}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
          <Command
            filter={(cmdValue, search) => {
              return cmdValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <CommandInput placeholder="Search city, country, or timezone…" className="border-0 focus:ring-0" />
            </div>
            <CommandList className="max-h-80">
              <CommandEmpty>No cities found</CommandEmpty>
              {recentCities.length > 0 && (
                <CommandGroup heading="Recent">
                  {recentCities.map((c) => (
                    <CityRow key={`r-${cityKey(c)}`} city={c} now={now} selected={cityKey(c) === cityKey(value)} onSelect={handleSelect} />
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="Popular">
                {popularCities.map((c) => (
                  <CityRow key={`p-${cityKey(c)}`} city={c} now={now} selected={cityKey(c) === cityKey(value)} onSelect={handleSelect} />
                ))}
              </CommandGroup>
              <CommandGroup heading="All cities">
                {otherCities.map((c) => (
                  <CityRow key={`a-${cityKey(c)}`} city={c} now={now} selected={cityKey(c) === cityKey(value)} onSelect={handleSelect} />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CityRow({
  city,
  now,
  selected,
  onSelect,
}: {
  city: City;
  now: Date;
  selected: boolean;
  onSelect: (c: City) => void;
}) {
  const parts = getPartsInTz(now, city.timezone);
  return (
    <CommandItem
      value={`${city.name} ${city.country} ${city.timezone}`}
      onSelect={() => onSelect(city)}
      className="gap-2"
    >
      <span className="text-base leading-none">{city.emoji}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{city.name}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{city.country}</span>
      </span>
      <span className="text-xs font-mono tabular-nums text-muted-foreground">
        {pad2(parts.hour)}:{pad2(parts.minute)}
      </span>
      <Check className={cn("ml-1 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );
}
