// Server-only Semrush gateway helper. Never import from a client bundle.
// This file is safe to import from *.functions.ts handlers (dynamic import),
// but must NOT be imported at module scope of route files.

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/semrush";

export class SemrushError extends Error {
  constructor(
    public code:
      | "not_configured"
      | "quota_exceeded"
      | "invalid_input"
      | "not_found"
      | "upstream",
    message: string,
  ) {
    super(message);
    this.name = "SemrushError";
  }
}

function requireKeys() {
  const lovable = process.env.LOVABLE_API_KEY;
  const semrush = process.env.SEMRUSH_API_KEY;
  if (!lovable || !semrush) {
    throw new SemrushError(
      "not_configured",
      "The SEO backend is not connected yet. Ask the site owner to link Semrush.",
    );
  }
  return { lovable, semrush };
}

export interface SemrushRow {
  [column: string]: string;
}

export interface SemrushResult {
  columnNames: string[];
  rows: SemrushRow[];
}

/**
 * Call the Semrush OAuth gateway.
 * Response is normalised to `{ columnNames, rows }` even when the gateway
 * returns CSV (some endpoints do).
 */
export async function semrushFetch(
  resourceGroup: string,
  method: string,
  params: Record<string, string | number | undefined>,
): Promise<SemrushResult> {
  const { lovable, semrush } = requireKeys();

  const url = new URL(`${GATEWAY_BASE}/${resourceGroup}/${method}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": semrush,
      Accept: "application/json",
    },
  });

  const bodyText = await res.text();

  // Quota exhausted
  if (bodyText.includes("ERROR 134") || bodyText.includes("TOTAL LIMIT EXCEEDED")) {
    throw new SemrushError(
      "quota_exceeded",
      "The SEO data quota has been reached. Please try again later.",
    );
  }
  // "Nothing found" — legitimate empty result
  if (bodyText.includes("ERROR 50") || bodyText.startsWith("NOTHING FOUND")) {
    return { columnNames: [], rows: [] };
  }

  if (!res.ok) {
    // Try to parse JSON error body from the gateway
    try {
      const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
      const msg = parsed.error || parsed.message || bodyText.slice(0, 200);
      throw new SemrushError("upstream", msg);
    } catch (e) {
      if (e instanceof SemrushError) throw e;
      throw new SemrushError("upstream", `Semrush error (${res.status})`);
    }
  }

  // Try JSON first (OAuth gateway shape)
  try {
    const json = JSON.parse(bodyText) as {
      data?: { columnNames?: string[]; rows?: (string[] | Record<string, string>)[] };
      error?: string;
    };
    if (json.error) throw new SemrushError("upstream", json.error);
    const data = json.data;
    if (data && Array.isArray(data.columnNames) && Array.isArray(data.rows)) {
      const cols = data.columnNames;
      const rows = data.rows.map((r) => {
        if (Array.isArray(r)) {
          const obj: SemrushRow = {};
          cols.forEach((c, i) => (obj[c] = String(r[i] ?? "")));
          return obj;
        }
        return r as SemrushRow;
      });
      return { columnNames: cols, rows };
    }
    return { columnNames: [], rows: [] };
  } catch (e) {
    if (e instanceof SemrushError) throw e;
  }

  // Fallback: parse CSV (Semrush v3 default), header + rows separated by newlines, fields by `;`
  const lines = bodyText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { columnNames: [], rows: [] };
  const columnNames = lines[0].split(";");
  const rows: SemrushRow[] = lines.slice(1).map((line) => {
    const parts = line.split(";");
    const obj: SemrushRow = {};
    columnNames.forEach((c, i) => (obj[c] = parts[i] ?? ""));
    return obj;
  });
  return { columnNames, rows };
}

/** Normalise a numeric string ("1,234" or "12.5") to a number, or 0. */
export function num(s: string | undefined): number {
  if (!s) return 0;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Common Semrush country databases we expose in the UI. */
export const SEMRUSH_DATABASES = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "br", label: "Brazil" },
  { value: "in", label: "India" },
  { value: "jp", label: "Japan" },
  { value: "nl", label: "Netherlands" },
  { value: "pl", label: "Poland" },
  { value: "mx", label: "Mexico" },
  { value: "ar", label: "Argentina" },
] as const;

export const DB_VALUES = SEMRUSH_DATABASES.map((d) => d.value) as [string, ...string[]];

/** Strip protocol/path from user input to get a bare hostname. */
export function normaliseDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

/** Ensure the input is a full URL (adds https:// if missing). */
export function normaliseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}
