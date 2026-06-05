import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Play, Pause, Heart, Loader2, Search, Radio as RadioIcon, Volume2, MapPin, Star } from "lucide-react";
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

const PINNED_STATIONS: Station[] = [
  {
    stationuuid: "pinned-tarab-radio-ma",
    name: "إذاعة الطرب العربي (Tarab Radio)",
    url_resolved: "https://stream.zeno.fm/fy8achbq97zuv",
    url: "https://stream.zeno.fm/fy8achbq97zuv",
    country: "Morocco",
    countrycode: "MA",
    geo_lat: 33.9716,
    geo_long: -6.8498,
    tags: "arabic, classical, tarab",
    favicon: "https://www.tarabradio.ma/favicon.ico",
    votes: 9999,
  },
  {
    stationuuid: "pinned-medi1-tarab-ma",
    name: "Medi 1 Tarab (ميدي 1 طرب)",
    url_resolved: "https://stream.medi1.com/medi1tarab",
    url: "https://stream.medi1.com/medi1tarab",
    country: "Morocco",
    countrycode: "MA",
    geo_lat: 33.9716,
    geo_long: -6.8498,
    tags: "arabic, tarab, classical, morocco",
    favicon: "https://www.medi1.com/favicon.ico",
    votes: 9998,
  },
];
const PINNED_IDS = new Set(PINNED_STATIONS.map(s => s.stationuuid));
const isPinned = (uuid: string) => PINNED_IDS.has(uuid);

function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65, A + cc.toUpperCase().charCodeAt(1) - 65);
}

const CAPITALS: Record<string, [number, number]> = {
  // Americas
  US: [38.9072, -77.0369], CA: [45.4215, -75.6972], MX: [19.4326, -99.1332],
  GT: [14.6349, -90.5069], BZ: [17.2510, -88.7590], SV: [13.6929, -89.2182],
  HN: [14.0723, -87.1921], NI: [12.1149, -86.2362], CR: [9.9281, -84.0907],
  PA: [8.9824, -79.5199], CU: [23.1136, -82.3666], JM: [17.9714, -76.7931],
  HT: [18.5944, -72.3074], DO: [18.4861, -69.9312], PR: [18.4655, -66.1057],
  BS: [25.0343, -77.3963], BB: [13.1939, -59.5432], TT: [10.6918, -61.2225],
  BR: [-15.7939, -47.8828], AR: [-34.6037, -58.3816], CL: [-33.4489, -70.6693],
  CO: [4.7110, -74.0721], PE: [-12.0464, -77.0428], VE: [10.4806, -66.9036],
  UY: [-34.9011, -56.1645], EC: [-0.1807, -78.4678], BO: [-16.4897, -68.1193],
  PY: [-25.2637, -57.5759], GY: [6.8013, -58.1551], SR: [5.8520, -55.2038],
  GF: [4.9224, -52.3135],
  // Europe
  GB: [51.5074, -0.1278], IE: [53.3498, -6.2603], FR: [48.8566, 2.3522],
  DE: [52.52, 13.405], ES: [40.4168, -3.7038], PT: [38.7223, -9.1393],
  IT: [41.9028, 12.4964], NL: [52.3676, 4.9041], BE: [50.8503, 4.3517],
  LU: [49.6116, 6.1319], CH: [46.948, 7.4474], AT: [48.2082, 16.3738],
  SE: [59.3293, 18.0686], NO: [59.9139, 10.7522], DK: [55.6761, 12.5683],
  FI: [60.1699, 24.9384], IS: [64.1466, -21.9426], PL: [52.2297, 21.0122],
  CZ: [50.0755, 14.4378], SK: [48.1486, 17.1077], HU: [47.4979, 19.0402],
  RO: [44.4268, 26.1025], BG: [42.6977, 23.3219], GR: [37.9838, 23.7275],
  RS: [44.7866, 20.4489], HR: [45.815, 15.9819], SI: [46.0569, 14.5058],
  BA: [43.8563, 18.4131], ME: [42.4304, 19.2594], MK: [41.9981, 21.4254],
  AL: [41.3275, 19.8187], XK: [42.6629, 21.1655], MD: [47.0105, 28.8638],
  UA: [50.4501, 30.5234], BY: [53.9006, 27.5590], LT: [54.6872, 25.2797],
  LV: [56.9496, 24.1052], EE: [59.4370, 24.7536], RU: [55.7558, 37.6173],
  MT: [35.8989, 14.5146], CY: [35.1856, 33.3823], AD: [42.5063, 1.5218],
  MC: [43.7384, 7.4246], LI: [47.1410, 9.5209], SM: [43.9424, 12.4578],
  VA: [41.9029, 12.4534], FO: [62.0079, -6.7900], GL: [64.1814, -51.6941],
  GI: [36.1408, -5.3536],
  // Middle East & North Africa
  TR: [39.9334, 32.8597], IL: [31.7683, 35.2137], PS: [31.9474, 35.2273],
  SA: [24.7136, 46.6753], AE: [24.4539, 54.3773], EG: [30.0444, 31.2357],
  MA: [34.0209, -6.8417], DZ: [36.7538, 3.0588], TN: [36.8065, 10.1815],
  LY: [32.8872, 13.1913], JO: [31.9454, 35.9284], LB: [33.8938, 35.5018],
  SY: [33.5138, 36.2765], IQ: [33.3152, 44.3661], IR: [35.6892, 51.3890],
  QA: [25.2854, 51.5310], KW: [29.3759, 47.9774], YE: [15.3694, 44.1910],
  OM: [23.5880, 58.3829], BH: [26.2285, 50.5860], AF: [34.5553, 69.2075],
  // Sub-Saharan Africa
  ZA: [-25.7479, 28.2293], NG: [9.0765, 7.3986], KE: [-1.2921, 36.8219],
  GH: [5.6037, -0.1870], ET: [9.0320, 38.7469], TZ: [-6.7924, 39.2083],
  UG: [0.3476, 32.5825], SN: [14.7167, -17.4677], CI: [6.8276, -5.2893],
  CM: [3.848, 11.5021], SD: [15.5007, 32.5599], SS: [4.8594, 31.5713],
  SO: [2.0469, 45.3182], DJ: [11.5721, 43.1456], ER: [15.3229, 38.9251],
  RW: [-1.9706, 30.1044], BI: [-3.3614, 29.3599], CD: [-4.4419, 15.2663],
  CG: [-4.2634, 15.2429], GA: [0.4162, 9.4673], GQ: [3.7504, 8.7371],
  CF: [4.3947, 18.5582], TD: [12.1348, 15.0557], NE: [13.5117, 2.1251],
  ML: [12.6392, -8.0029], BF: [12.3714, -1.5197], BJ: [6.4969, 2.6283],
  TG: [6.1725, 1.2314], LR: [6.3008, -10.7967], SL: [8.4657, -13.2317],
  GN: [9.6412, -13.5784], GW: [11.8636, -15.5977], GM: [13.4549, -16.5790],
  CV: [14.9330, -23.5133], MR: [18.0735, -15.9582], EH: [27.1418, -13.1626],
  AO: [-8.8390, 13.2894], ZM: [-15.3875, 28.3228], ZW: [-17.8252, 31.0335],
  MZ: [-25.9692, 32.5732], MW: [-13.9626, 33.7741], BW: [-24.6282, 25.9231],
  NA: [-22.5609, 17.0658], LS: [-29.3151, 27.4869], SZ: [-26.3054, 31.1367],
  MG: [-18.8792, 47.5079], MU: [-20.1640, 57.5036], SC: [-4.6191, 55.4513],
  KM: [-11.7172, 43.2473], RE: [-20.8789, 55.4481], YT: [-12.7806, 45.2278],
  ST: [0.3302, 6.7333],
  // Asia
  JP: [35.6762, 139.6503], KR: [37.5665, 126.9780], KP: [39.0392, 125.7625],
  CN: [39.9042, 116.4074], MN: [47.8864, 106.9057], IN: [28.6139, 77.2090],
  PK: [33.6844, 73.0479], BD: [23.8103, 90.4125], LK: [6.9271, 79.8612],
  NP: [27.7172, 85.3240], BT: [27.4728, 89.6390], MV: [4.1755, 73.5093],
  ID: [-6.2088, 106.8456], TH: [13.7563, 100.5018], VN: [21.0285, 105.8542],
  PH: [14.5995, 120.9842], MY: [3.139, 101.6869], SG: [1.3521, 103.8198],
  TW: [25.0330, 121.5654], HK: [22.3193, 114.1694], MO: [22.1987, 113.5439],
  KH: [11.5564, 104.9282], MM: [16.8409, 96.1735], LA: [17.9757, 102.6331],
  BN: [4.9031, 114.9398], TL: [-8.5569, 125.5603],
  // Central Asia & Caucasus
  KZ: [51.1605, 71.4704], UZ: [41.2995, 69.2401], TM: [37.9601, 58.3261],
  KG: [42.8746, 74.5698], TJ: [38.5598, 68.7870], AZ: [40.4093, 49.8671],
  AM: [40.1792, 44.4991], GE: [41.7151, 44.8271],
  // Oceania
  AU: [-35.2809, 149.13], NZ: [-41.2865, 174.7762], PG: [-9.4438, 147.1803],
  FJ: [-18.1416, 178.4419], SB: [-9.4280, 159.9498], VU: [-17.7333, 168.3273],
  NC: [-22.2758, 166.4580], PF: [-17.5516, -149.5585], WS: [-13.8506, -171.7513],
  TO: [-21.1789, -175.1982], KI: [1.3290, 172.9790], MH: [7.1164, 171.1858],
  FM: [6.9248, 158.1611], PW: [7.5004, 134.6243], NR: [-0.5477, 166.9209],
  TV: [-8.5243, 179.1942], GU: [13.4443, 144.7937],
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function getStationCoords(s: Station): [number, number] | null {
  const lat = s.geo_lat;
  const lng = s.geo_long;
  if (typeof lat === "number" && typeof lng === "number" && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return [lat, lng];
  }
  const cc = (s.countrycode || "").toUpperCase();
  if (cc && CAPITALS[cc]) {
    const [clat, clng] = CAPITALS[cc];
    const h = hashStr(s.stationuuid);
    const jLat = (((h & 0xffff) / 0xffff) - 0.5) * 1.0;
    const jLng = ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * 1.0;
    return [clat + jLat, clng + jLng];
  }
  return null;
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
  const [fetching, setFetching] = useState(false);
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
          apiFetch<Station[]>("/stations/topvote/3000"),
          apiFetch<Country[]>("/countries"),
        ]);
        if (!alive) return;
        const filtered = top.filter(s => s.url_resolved && !PINNED_IDS.has(s.stationuuid));
        setStations([...PINNED_STATIONS, ...filtered]);
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
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { try { map.setView([pos.coords.latitude, pos.coords.longitude], 4); } catch {} },
          () => {},
          { timeout: 4000 }
        );
      }
    })();
    const onResize = () => { try { mapRef.current?.invalidateSize(); } catch {} };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, []);

  // Add markers when stations change
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !clusterRef.current) return;
    clusterRef.current.clearLayers();
    markersByIdRef.current.clear();
    stations.forEach(s => {
      const coords = getStationCoords(s);
      if (!coords) return;
      const radius = Math.max(3, Math.min(10, Math.log((s.votes ?? 0) + 1) * 1.5));
      const m = L.circleMarker(coords, {
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
    if (!current) return;
    const coords = getStationCoords(current);
    if (!coords) return;
    pulseRef.current = L.circle(coords, {
      radius: 60000,
      color: ACCENT,
      fillColor: ACCENT,
      fillOpacity: 0.15,
      weight: 2,
      className: "wr-pulse-ring",
      interactive: false,
    }).addTo(mapRef.current);
    try { mapRef.current.flyTo(coords, Math.max(mapRef.current.getZoom(), 5), { duration: 0.8 }); } catch {}
  }, [current]);

  // Fetch more stations when a country filter is selected
  useEffect(() => {
    if (!country) return;
    let alive = true;
    setFetching(true);
    (async () => {
      try {
        const found = await apiFetch<Station[]>(`/stations/bycountrycodeexact/${country}?limit=1000&hidebroken=true&order=votes&reverse=true`);
        if (!alive) return;
        setStations(prev => {
          const seen = new Set(prev.map(s => s.stationuuid));
          const fresh = found.filter(s => s.url_resolved && !seen.has(s.stationuuid));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      } catch {}
      finally { if (alive) setFetching(false); }
    })();
    return () => { alive = false; };
  }, [country]);

  // Fetch more stations when a genre/tag filter is selected
  useEffect(() => {
    if (!tag) return;
    let alive = true;
    setFetching(true);
    (async () => {
      try {
        const found = await apiFetch<Station[]>(`/stations/bytag/${encodeURIComponent(tag)}?limit=1000&hidebroken=true&order=votes&reverse=true`);
        if (!alive) return;
        setStations(prev => {
          const seen = new Set(prev.map(s => s.stationuuid));
          const fresh = found.filter(s => s.url_resolved && !seen.has(s.stationuuid));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      } catch {}
      finally { if (alive) setFetching(false); }
    })();
    return () => { alive = false; };
  }, [tag]);

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
      const ap = isPinned(a.stationuuid) ? 1 : 0;
      const bp = isPinned(b.stationuuid) ? 1 : 0;
      if (ap !== bp) return bp - ap;
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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-[40fr_60fr] lg:grid-cols-[35fr_65fr] pb-28 max-w-full overflow-x-hidden">
        {/* Left panel */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-3 md:order-1 order-2 min-w-0 md:h-[60vh] lg:h-[75vh]">
          <div className="flex gap-2 text-sm">
            <button onClick={() => setTab("all")} className={`flex-1 py-2 rounded-md border transition-colors ${tab === "all" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>All Stations</button>
            <button onClick={() => setTab("fav")} className={`flex-1 py-2 rounded-md border transition-colors ${tab === "fav" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>Favourites ({favs.length})</button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, country, genre..." className="pl-9 w-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={country || "all"} onValueChange={v => setCountry(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All countries</SelectItem>
                {countries.map(c => <SelectItem key={c.iso_3166_1} value={c.iso_3166_1}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tag || "all"} onValueChange={v => setTag(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {TAGS.filter(Boolean).map(t => <SelectItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={language || "all"} onValueChange={v => setLanguage(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All languages</SelectItem>
                {languageOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map(s => <SelectItem key={s.value} value={s.value}>Sort: {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5 min-h-[300px] max-h-[calc(100vh-45vh-9rem)] md:max-h-none">
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
                    <div className="text-sm font-medium truncate flex items-center gap-1">
                      {isPinned(s.stationuuid) && (
                        <Star className="w-3.5 h-3.5 fill-current text-yellow-400 shrink-0" aria-label="Featured" />
                      )}
                      <span className="truncate">{s.name}</span>
                    </div>
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
        <div className="relative rounded-xl border border-border overflow-hidden md:order-2 order-1 min-w-0 h-[45vh] md:h-[60vh] lg:min-h-[75vh] lg:h-[75vh]">
          <div ref={mapElRef} className="w-full h-full" />
          {(loading || fetching) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] pointer-events-none z-[400]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card/80 border border-border text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading stations...
              </div>
            </div>
          )}
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

      <RelatedTools currentSlug="world-radio" />
    </ToolPageShell>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
