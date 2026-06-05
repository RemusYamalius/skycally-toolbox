import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Play, Pause, Heart, Loader2, Search, Radio as RadioIcon, Volume2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { loadScript } from "@/lib/cdnScript";

export const Route = createFileRoute("/tools/world-radio")({
  head: () => buildToolMeta(toolBySlug("world-radio", tools)),
  component: WorldRadioPage,
});

const API_BASE = "https://de1.api.radio-browser.info/json";
const ACCENT = "#00ff88";
const FAV_KEY = "world-radio:favourites";

interface Station {
  stationuuid: string;
  name: string;
  url_resolved: string;
  url: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  tags?: string;
  votes?: number;
  bitrate?: number;
  geo_lat?: number | null;
  geo_long?: number | null;
}

interface Country { name: string; iso_3166_1: string; stationcount: number; }

const TAGS = ["", "news", "music", "pop", "rock", "jazz", "classical", "talk", "sports", "religion", "culture", "dance", "electronic", "hiphop"];
const SORTS = [
  { value: "votes", label: "Popularity" },
  { value: "name", label: "Name" },
  { value: "bitrate", label: "Bitrate" },
];

function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65, A + cc.toUpperCase().charCodeAt(1) - 65);
}

function loadStylesheet(href: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function WorldRadioPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [tag, setTag] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("votes");
  const [tab, setTab] = useState<"all" | "fav">("all");

  const [current, setCurrent] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [favs, setFavs] = useState<Station[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef(false);

  const mapRef = useRef<any>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const clusterRef = useRef<any>(null);
  const markersByIdRef = useRef<Map<string, any>>(new Map());
  const pulseRef = useRef<any>(null);

  // Load favourites
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(JSON.parse(raw));
    } catch {}
  }, []);
  const persistFavs = (next: Station[]) => {
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
  };
  const isFav = (uuid: string) => favs.some(f => f.stationuuid === uuid);
  const toggleFav = (s: Station) => {
    if (isFav(s.stationuuid)) persistFavs(favs.filter(f => f.stationuuid !== s.stationuuid));
    else persistFavs([...favs, s]);
  };

  // Fetch top stations + countries
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [top, cs] = await Promise.all([
          apiFetch<Station[]>("/stations/topvote/200"),
          apiFetch<Country[]>("/countries"),
        ]);
        if (!alive) return;
        setStations(top.filter(s => s.url_resolved));
        setCountries(cs.filter(c => c.stationcount > 5).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        toast.error("Failed to load radio stations");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || !mapElRef.current) return;
    let cancelled = false;
    (async () => {
      loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
      loadStylesheet("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css");
      loadStylesheet("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");
      await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
      await loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js");
      if (cancelled || !mapElRef.current) return;
      const L = (window as any).L;
      if (!L || mapRef.current) return;
      const map = L.map(mapElRef.current, { worldCopyJump: true, zoomControl: true }).setView([20, 0], 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      clusterRef.current = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 });
      map.addLayer(clusterRef.current);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { try { map.setView([pos.coords.latitude, pos.coords.longitude], 4); } catch {} },
          () => {},
          { timeout: 4000 }
        );
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, []);

  // Add markers when stations change
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !clusterRef.current) return;
    clusterRef.current.clearLayers();
    markersByIdRef.current.clear();
    const geo = stations.filter(s => typeof s.geo_lat === "number" && typeof s.geo_long === "number" && s.geo_lat && s.geo_long);
    geo.forEach(s => {
      const radius = Math.max(3, Math.min(10, Math.log((s.votes ?? 0) + 1) * 1.5));
      const m = L.circleMarker([s.geo_lat as number, s.geo_long as number], {
        radius,
        color: ACCENT,
        fillColor: ACCENT,
        fillOpacity: 0.85,
        weight: 1,
        className: "wr-glow-dot",
      });
      m.bindPopup(
        `<div style="font-family:inherit"><strong>${escapeHtml(s.name)}</strong><br/>${flagEmoji(s.countrycode)} ${escapeHtml(s.country ?? "")}<br/><span style="opacity:.7">${escapeHtml((s.tags ?? "").split(",")[0] || "")}</span> · ${s.bitrate ?? 0} kbps</div>`
      );
      m.on("click", () => playStation(s));
      clusterRef.current.addLayer(m);
      markersByIdRef.current.set(s.stationuuid, m);
    });
  }, [stations]);

  // Pulse on current
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    if (pulseRef.current) { try { mapRef.current.removeLayer(pulseRef.current); } catch {} pulseRef.current = null; }
    if (!current || !current.geo_lat || !current.geo_long) return;
    pulseRef.current = L.circle([current.geo_lat, current.geo_long], {
      radius: 60000,
      color: ACCENT,
      fillColor: ACCENT,
      fillOpacity: 0.15,
      weight: 2,
      className: "wr-pulse-ring",
    }).addTo(mapRef.current);
    try { mapRef.current.flyTo([current.geo_lat, current.geo_long], Math.max(mapRef.current.getZoom(), 5), { duration: 0.8 }); } catch {}
  }, [current]);

  const playStation = useCallback((s: Station) => {
    setCurrent(s);
    retryRef.current = false;
    // Fire stats
    fetch(`${API_BASE}/url/${s.stationuuid}`).catch(() => {});
  }, []);

  // Audio control
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    a.src = current.url_resolved;
    a.volume = volume;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [current]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const onAudioError = () => {
    if (!current) return;
    if (!retryRef.current) {
      retryRef.current = true;
      setTimeout(() => {
        const a = audioRef.current;
        if (a && current) { a.src = current.url_resolved; a.play().catch(() => {}); }
      }, 1500);
    } else {
      toast.error("Stream unavailable, try another station");
      setPlaying(false);
      setBuffering(false);
    }
  };

  // Filtered list
  const visible = useMemo(() => {
    const src = tab === "fav" ? favs : stations;
    const q = query.trim().toLowerCase();
    let out = src.filter(s => {
      if (country && s.countrycode !== country) return false;
      if (tag && !(s.tags ?? "").toLowerCase().includes(tag)) return false;
      if (language && !(s.language ?? "").toLowerCase().includes(language.toLowerCase())) return false;
      if (q) {
        const hay = `${s.name} ${s.country ?? ""} ${s.tags ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "bitrate") return (b.bitrate ?? 0) - (a.bitrate ?? 0);
      return (b.votes ?? 0) - (a.votes ?? 0);
    });
    return out.slice(0, 100);
  }, [stations, favs, tab, query, country, tag, language, sort]);

  // Debounced remote search if no local matches
  useEffect(() => {
    if (query.trim().length < 3) return;
    const t = setTimeout(async () => {
      const q = query.trim().toLowerCase();
      const localHit = stations.some(s => s.name.toLowerCase().includes(q));
      if (localHit) return;
      try {
        const found = await apiFetch<Station[]>(`/stations/byname/${encodeURIComponent(query.trim())}`);
        const fresh = found.filter(s => s.url_resolved && !stations.some(x => x.stationuuid === s.stationuuid));
        if (fresh.length) setStations(prev => [...prev, ...fresh.slice(0, 50)]);
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [query, stations]);

  const languageOptions = useMemo(() => {
    const set = new Set<string>();
    stations.forEach(s => (s.language ?? "").split(",").forEach(l => { const v = l.trim(); if (v) set.add(v); }));
    return Array.from(set).sort().slice(0, 50);
  }, [stations]);

  return (
    <ToolPageShell title="World Radio" description="Explore live radio stations from every corner of the world on an interactive map.">
      <style>{`
        .wr-glow-dot { filter: drop-shadow(0 0 4px ${ACCENT}); }
        .wr-pulse-ring { animation: wr-pulse 2s ease-out infinite; transform-origin: center; }
        @keyframes wr-pulse {
          0% { opacity: .6; }
          100% { opacity: .1; }
        }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: hsl(var(--card)); color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
        }
        .leaflet-container { background: #0a0a0a; }
      `}</style>

      <div className="grid gap-4 md:grid-cols-[2fr_3fr] pb-28">
        {/* Left panel */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-3 md:order-1 order-2 md:h-[70vh]">
          <div className="flex gap-2 text-sm">
            <button onClick={() => setTab("all")} className={`flex-1 py-2 rounded-md border transition-colors ${tab === "all" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>All Stations</button>
            <button onClick={() => setTab("fav")} className={`flex-1 py-2 rounded-md border transition-colors ${tab === "fav" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>Favourites ({favs.length})</button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, country, genre..." className="pl-9" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={country || "all"} onValueChange={v => setCountry(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All countries</SelectItem>
                {countries.map(c => <SelectItem key={c.iso_3166_1} value={c.iso_3166_1}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tag || "all"} onValueChange={v => setTag(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {TAGS.filter(Boolean).map(t => <SelectItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={language || "all"} onValueChange={v => setLanguage(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All languages</SelectItem>
                {languageOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map(s => <SelectItem key={s.value} value={s.value}>Sort: {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5 min-h-[300px]">
            {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
            {!loading && visible.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">No stations found</div>
            )}
            {visible.map(s => {
              const active = current?.stationuuid === s.stationuuid;
              return (
                <button
                  key={s.stationuuid}
                  onClick={() => playStation(s)}
                  className={`w-full text-left flex items-center gap-3 p-2 rounded-md border transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/50"}`}
                >
                  <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {s.favicon ? (
                      <img src={s.favicon} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : <RadioIcon className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {flagEmoji(s.countrycode)} {s.country || "Unknown"} · {(s.tags ?? "").split(",")[0] || "—"}
                    </div>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle favourite"
                    onClick={(e) => { e.stopPropagation(); toggleFav(s); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleFav(s); } }}
                    className="p-1 rounded hover:bg-accent cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFav(s.stationuuid) ? "fill-current text-red-500" : "text-muted-foreground"}`} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="rounded-xl border border-border overflow-hidden md:order-2 order-1 h-[50vh] md:h-[70vh]">
          <div ref={mapElRef} className="w-full h-full" />
        </div>
      </div>

      {/* Bottom player */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {current?.favicon ? (
              <img src={current.favicon} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : <RadioIcon className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{current?.name || "Select a station to start listening"}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
              {current && (
                <>
                  <MapPin className="w-3 h-3" /> {flagEmoji(current.countrycode)} {current.country || "—"}
                  {current.bitrate ? <span>· {current.bitrate} kbps</span> : null}
                  {(current.tags ?? "").split(",")[0] && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-foreground/80">{(current.tags ?? "").split(",")[0]}</span>}
                </>
              )}
            </div>
          </div>
          {current && (
            <Button variant="ghost" size="icon" onClick={() => toggleFav(current)} aria-label="Favourite">
              <Heart className={`w-4 h-4 ${isFav(current.stationuuid) ? "fill-current text-red-500" : ""}`} />
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider value={[volume * 100]} onValueChange={v => setVolume((v[0] ?? 0) / 100)} max={100} step={1} />
          </div>
          <Button size="icon" onClick={togglePlay} disabled={!current} aria-label="Play / Pause">
            {buffering ? <Loader2 className="w-4 h-4 animate-spin" /> : playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <audio
        ref={audioRef}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setPlaying(true); }}
        onPause={() => setPlaying(false)}
        onError={onAudioError}
        crossOrigin="anonymous"
      />

      <HowToUse
        steps={[
          "Browse the interactive map or search by country, name, or genre to find a station.",
          "Click any glowing dot on the map or any station card in the list to start playing instantly.",
          "Tap the heart icon to save your favourite stations for quick access anytime.",
        ]}
      />

      <ToolSeoContent
        title="World Radio — Listen to Live Stations Worldwide on an Interactive Map"
        description="Discover and stream thousands of free internet radio stations from every country. Explore music, news, and talk shows on a world map — directly in your browser."
        body={[
          "World Radio is a free online radio explorer that lets you tune into live FM and internet radio stations from across the globe. Browse a glowing world map, search by city or genre, and listen instantly — no account, no installs, no ads injected into the stream.",
          "The tool uses the open Radio Browser community catalog with tens of thousands of verified stations covering pop, rock, jazz, classical, news, sports, religious, and cultural broadcasts in dozens of languages. Click any green dot to start streaming, save favourites with one tap, and discover what people are listening to right now in Tokyo, Lagos, São Paulo, or any other city.",
          "Everything runs entirely in your browser. No data is stored on our servers and your favourites stay on your device. It's the easiest way to travel the world through sound.",
        ]}
        faqs={[
          { question: "Is World Radio free to use?", answer: "Yes — it's 100% free with no signup, no downloads, and no hidden limits. You can listen as long as you want." },
          { question: "Where do the stations come from?", answer: "All stations are sourced from the open Radio Browser community database, which catalogs thousands of public internet radio streams from around the world." },
          { question: "Why do some stations fail to play?", answer: "Internet radio streams occasionally go offline or change URLs. The player auto-retries once; if it still fails, just pick another station." },
          { question: "Are my favourites saved across devices?", answer: "Favourites are stored locally in your browser only. They persist on the same device but won't sync across different browsers or computers." },
        ]}
      />

      <RelatedTools slug="world-radio" />
    </ToolPageShell>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
