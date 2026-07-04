import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from "pdf-lib";

export const Route = createFileRoute("/tools/pdf-watermark-remover")({
  head: () => buildToolMeta(toolBySlug("pdf-watermark-remover", tools)),
  component: PdfWatermarkRemover,
});

// ---------- Stream byte helpers ----------

function decodeStreamBytes(stream: any): Uint8Array {
  try {
    if (typeof stream.getUnencodedContents === "function") {
      const result = stream.getUnencodedContents();
      if (result && result.length > 0) return result;
    }
  } catch {}
  try {
    if (typeof stream.getContents === "function") {
      const result = stream.getContents();
      if (result && result.length > 0) return result;
    }
  } catch {}
  try {
    if (stream.contents instanceof Uint8Array && stream.contents.length > 0) {
      return stream.contents;
    }
  } catch {}
  try {
    if (typeof stream.asPDFStream === "function") {
      return stream.asPDFStream().contents;
    }
  } catch {}
  return new Uint8Array();
}

function bytesToLatin1(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function nameToString(n: any): string {
  if (!n) return "";
  if (typeof n.asString === "function") {
    const s = n.asString();
    return s.startsWith("/") ? s.slice(1) : s;
  }
  return String(n);
}

// ---------- Strategy 1: text watermarks ----------

function extractShownStrings(content: string): string[] {
  const out: string[] = [];
  const reTj = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;
  while ((m = reTj.exec(content)) !== null) out.push(m[1]);
  const reTJ = /\[([^\]]*)\]\s*TJ/g;
  while ((m = reTJ.exec(content)) !== null) {
    const inner = m[1];
    const sre = /\(((?:\\.|[^()\\])*)\)/g;
    let s: RegExpExecArray | null;
    let joined = "";
    while ((s = sre.exec(inner)) !== null) joined += s[1];
    if (joined) out.push(joined);
  }
  return out;
}

function detectRepeatedStrings(pageContents: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const c of pageContents) {
    const seen = new Set(
      extractShownStrings(c)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2),
    );
    for (const s of seen) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const threshold = 1; // detect watermark appearing on any page
  const out = new Set<string>();
  for (const [s, n] of counts) if (n >= threshold) out.add(s);
  return out;
}

function findLowAlphaGStates(page: any): Set<string> {
  const out = new Set<string>();
  try {
    const resources = page.node.Resources();
    if (!resources) return out;
    const ext = resources.lookup(PDFName.of("ExtGState"));
    if (!ext || !(ext instanceof PDFDict)) return out;
    for (const [key, val] of ext.entries()) {
      let gs: any = val;
      try {
        if (gs instanceof PDFRef) gs = page.doc.context.lookup(gs);
      } catch {}
      if (gs instanceof PDFDict) {
        const ca = gs.lookup(PDFName.of("ca"));
        const CA = gs.lookup(PDFName.of("CA"));
        const caV = ca && typeof (ca as any).asNumber === "function" ? (ca as any).asNumber() : undefined;
        const CAV = CA && typeof (CA as any).asNumber === "function" ? (CA as any).asNumber() : undefined;
        if ((caV !== undefined && caV < 0.5) || (CAV !== undefined && CAV < 0.5)) {
          out.add(nameToString(key));
        }
      }
    }
  } catch {}
  return out;
}

function stripWatermarkTextBlocks(
  content: string,
  targets: Set<string>,
  lowAlphaGStates: Set<string>,
): { out: string; removed: number } {
  let removed = 0;

  function isRotated(text: string): boolean {
    const re = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(?:cm|Tm)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (Math.abs(parseFloat(m[2])) > 0.01 || Math.abs(parseFloat(m[3])) > 0.01) return true;
    }
    return false;
  }

  function hasLowAlpha(text: string): boolean {
    return [...text.matchAll(/\/([A-Za-z0-9_.+-]+)\s+gs/g)].map((m) => m[1]).some((g) => lowAlphaGStates.has(g));
  }

  function matchesTargets(text: string): boolean {
    return extractShownStrings(text)
      .map((s) => s.trim())
      .some((s) => targets.has(s));
  }

  const WATERMARK_KEYWORDS = /water\s*mark|confidential|draft|sample|specimen|do not copy|void|copy|برouillon|مسودة/i;

  function hasWatermarkKeyword(text: string): boolean {
    const strings = extractShownStrings(text);
    return strings.some((s) => WATERMARK_KEYWORDS.test(s));
  }

  function isWatermarkBlock(block: string): boolean {
    if (!/\bBT\b/.test(block)) return false;
    return isRotated(block) || hasLowAlpha(block) || matchesTargets(block) || hasWatermarkKeyword(block);
  }

  // Stack-based parser: correctly handles arbitrarily nested q...Q blocks
  const tokens = content.split(/(\bq\b|\bQ\b)/);
  const stack: string[] = [];
  let current = "";

  for (const token of tokens) {
    if (token === "q") {
      stack.push(current);
      current = "q";
    } else if (token === "Q") {
      const block = current + "\nQ";
      const parent = stack.pop() ?? "";
      if (isWatermarkBlock(block)) {
        removed++;
        current = parent;
      } else {
        current = parent + block;
      }
    } else {
      current += token;
    }
  }

  let out = current;
  out = out.replace(/BT\b([\s\S]*?)\bET\b/g, (full, body: string) => {
    if (isRotated(body) || hasLowAlpha(body) || matchesTargets(body)) {
      removed++;
      return "";
    }
    return full;
  });

  return { out, removed };
}

// ---------- Strategy 2: image watermarks ----------

function collectXObjectNames(page: any): Map<string, "Image" | "Form" | "Other"> {
  const out = new Map<string, "Image" | "Form" | "Other">();
  try {
    const resources = page.node.Resources();
    if (!resources) return out;
    const xobj = resources.lookup(PDFName.of("XObject"));
    if (!xobj || !(xobj instanceof PDFDict)) return out;
    for (const [key, val] of xobj.entries()) {
      let v: any = val;
      try {
        if (v instanceof PDFRef) v = page.doc.context.lookup(v);
      } catch {}
      let kind: "Image" | "Form" | "Other" = "Other";
      if (v instanceof PDFDict) {
        const sub = v.lookup(PDFName.of("Subtype"));
        const sn = nameToString(sub);
        if (sn === "Image") kind = "Image";
        else if (sn === "Form") kind = "Form";
      }
      out.set(nameToString(key), kind);
    }
  } catch {}
  return out;
}

function stripLargeImageDraws(
  content: string,
  pageWidth: number,
  pageHeight: number,
  imageNames: Set<string>,
  globalWatermarkImages: Set<string>,
): { out: string; removed: number } {
  let removed = 0;
  // Remove entire q ... Q blocks that draw a watermark image.
  const re = /q\b([\s\S]*?)\bQ\b/g;
  const out = content.replace(re, (full, body: string) => {
    const doMatches = [...body.matchAll(/\/([A-Za-z0-9_.+-]+)\s+Do\b/g)].map((m) => m[1]);
    if (!doMatches.length) return full;
    // Last cm in this block
    const cmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm/g;
    let lastA = 1,
      lastD = 1;
    let cm: RegExpExecArray | null;
    while ((cm = cmRe.exec(body)) !== null) {
      lastA = Math.abs(parseFloat(cm[1]));
      lastD = Math.abs(parseFloat(cm[4]));
    }
    const drop = doMatches.some((name) => {
      if (!imageNames.has(name)) return false;
      if (globalWatermarkImages.has(name)) return true;
      const wFrac = lastA / Math.max(1, pageWidth);
      const hFrac = lastD / Math.max(1, pageHeight);
      return wFrac > 0.4 && hFrac > 0.4;
    });
    if (drop) {
      removed++;
      return "";
    }
    return full;
  });
  return { out, removed };
}

// ---------- Strategy 3: stamp/watermark annotations ----------

function stripStampAnnots(page: any): number {
  let removed = 0;
  try {
    const annots = page.node.Annots();
    if (!annots || !(annots instanceof PDFArray)) return 0;
    const keep: any[] = [];
    const len = annots.size();
    for (let i = 0; i < len; i++) {
      const a: any = annots.get(i);
      let aDict: any = a;
      try {
        if (a instanceof PDFRef) aDict = page.doc.context.lookup(a);
      } catch {}
      let drop = false;
      if (aDict instanceof PDFDict) {
        const sub = aDict.lookup(PDFName.of("Subtype"));
        const name = nameToString(sub);
        if (name === "Stamp" || name === "Watermark") drop = true;
        // Also: FreeText / Square / Widget annots whose contents look like a watermark
        if (!drop) {
          const contents = aDict.lookup(PDFName.of("Contents"));
          const text = contents && typeof (contents as any).asString === "function" ? (contents as any).asString() : "";
          if (/water\s*mark|confidential|draft|sample|specimen/i.test(text)) drop = true;
        }
      }
      if (drop) removed++;
      else keep.push(a);
    }
    if (removed > 0) {
      const newArr = page.doc.context.obj(keep);
      page.node.set(PDFName.of("Annots"), newArr);
    }
  } catch {}
  return removed;
}

// Robust per-page content stream reader. Handles missing entries, direct
// streams, indirect refs, and arrays of refs/streams.
function getPageContents(page: any, pdf: any): string {
  try {
    let contents: any =
      (typeof page.node.get === "function" ? page.node.get(PDFName.of("Contents")) : undefined) ??
      (typeof page.node.lookup === "function" ? page.node.lookup(PDFName.of("Contents")) : undefined);
    if (!contents) return "";
    const arr: any[] =
      contents instanceof PDFArray
        ? contents.asArray()
        : contents instanceof PDFRef
          ? (() => {
              const resolved = pdf.context.lookup(contents);
              return resolved instanceof PDFArray ? resolved.asArray() : [resolved];
            })()
          : [contents];
    let merged = "";
    for (const item of arr) {
      let s: any = item;
      try {
        if (s instanceof PDFRef) s = pdf.context.lookup(s);
      } catch {}
      const sb = decodeStreamBytes(s);
      merged += bytesToLatin1(sb) + "\n";
    }
    return merged;
  } catch {
    return "";
  }
}

// ---------- Strategy 5: Word/Office vector watermark via Artifact BDC blocks ----------
// Word exports watermarks as /Artifact BDC blocks with low-opacity GS state
// containing vector paths (m c h f operators). These are NOT text — they are
// drawn shapes that form Arabic calligraphy or text outlines.

function stripArtifactWatermarkBlocks(content: string, lowAlphaGStates: Set<string>): { out: string; removed: number } {
  let removed = 0;

  // Match /Artifact BDC ... EMC blocks (Word watermarks use Type/Pagination)
  // Use non-greedy .*? to handle nested << >> correctly
  const artifactRe = /\/Artifact\s*<<.*?>>\s*BDC([\s\S]*?)EMC/g;

  const out = content.replace(artifactRe, (full, body: string) => {
    // Check 1: uses a known low-alpha GS state
    const usesLowAlpha = [...body.matchAll(/\/([A-Za-z0-9_.+-]+)\s+gs/g)].some((m) => lowAlphaGStates.has(m[1]));

    // Check 2: contains vector drawing ops (m, c, h) but no text (BT/ET)
    // This is the signature of Word's calligraphic watermarks
    const hasVectorPaths = /\b[mch]\b/.test(body) && !/\bBT\b/.test(body);

    // Check 3: uses light gray fill color (0.5–0.95 range = translucent watermark)
    const hasLightGray = /\b0\.[5-9]\d*\s+g\b/.test(body);

    // Check 4: any GS state reference (even if not in our lowAlpha set)
    // Word watermarks always reference a GS state for transparency
    const hasAnyGS = /\/GS\d+\s+gs/.test(body);

    // Remove if: (any GS + vector paths + light gray) OR (lowAlpha + vector/gray)
    const isWatermark =
      (hasVectorPaths && hasLightGray && hasAnyGS) || (usesLowAlpha && (hasVectorPaths || hasLightGray));

    if (isWatermark) {
      removed++;
      return "";
    }
    return full;
  });

  return { out, removed };
}

// ---------- Strategy 4: Word/Office watermark via header XObjects ----------
// Word exports watermarks as Form XObjects referenced from the page /Resources
// under names like "Watermark", "WMK", "wm", etc., or as the only large Form
// XObject drawn with low opacity in the page content stream.

function stripWordWatermarkXObjects(page: any, pdf: any): number {
  let removed = 0;
  try {
    const resources = page.node.Resources();
    if (!resources) return 0;
    const xobj = resources.lookup(PDFName.of("XObject"));
    if (!xobj || !(xobj instanceof PDFDict)) return 0;

    const toRemove: string[] = [];
    for (const [key, val] of xobj.entries()) {
      let v: any = val;
      try {
        if (v instanceof PDFRef) v = pdf.context.lookup(v);
      } catch {}
      if (!(v instanceof PDFDict)) continue;

      const subtype = nameToString(v.lookup(PDFName.of("Subtype")));
      if (subtype !== "Form") continue;

      const keyStr = nameToString(key);

      // Match by name: Word uses names like "Watermark", "WMK", "wm1", "drw1" etc.
      if (/water|wmk|wm\d|filigrane|مؤقت|draft|confidential|sample/i.test(keyStr)) {
        toRemove.push(keyStr);
        continue;
      }

      // Check the Form XObject's own resources for low-alpha graphics states
      try {
        const formResources = v.lookup(PDFName.of("Resources"));
        if (formResources instanceof PDFDict) {
          const formExt = formResources.lookup(PDFName.of("ExtGState"));
          if (formExt instanceof PDFDict) {
            for (const [, gsVal] of formExt.entries()) {
              let gs: any = gsVal;
              try {
                if (gs instanceof PDFRef) gs = pdf.context.lookup(gs);
              } catch {}
              if (gs instanceof PDFDict) {
                const ca = gs.lookup(PDFName.of("ca"));
                const CA = gs.lookup(PDFName.of("CA"));
                const caV = ca && typeof (ca as any).asNumber === "function" ? (ca as any).asNumber() : undefined;
                const CAV = CA && typeof (CA as any).asNumber === "function" ? (CA as any).asNumber() : undefined;
                // Translucide Word watermarks typically use opacity 0.3-0.5
                if ((caV !== undefined && caV < 0.6) || (CAV !== undefined && CAV < 0.6)) {
                  toRemove.push(keyStr);
                  break;
                }
              }
            }
          }
        }
      } catch {}
    }

    if (toRemove.length > 0) {
      for (const name of toRemove) {
        try {
          xobj.delete(PDFName.of(name));
        } catch {}
        removed++;
      }
    }

    // Also strip the /Do calls for these XObjects from the page content
    if (removed > 0) {
      const content = getPageContents(page, pdf);
      if (content) {
        let cleaned = content;
        for (const name of toRemove) {
          // Remove q...Q blocks that only draw this XObject
          cleaned = cleaned.replace(new RegExp(`q[\\s\\S]*?\/${name}\\s+Do[\\s\\S]*?Q`, "g"), "");
          // Remove bare /Name Do calls
          cleaned = cleaned.replace(new RegExp(`\\/${name}\\s+Do`, "g"), "");
        }
        if (cleaned !== content) {
          const contentBytes = latin1ToBytes(cleaned);
          const newStream = pdf.context.stream(contentBytes, {
            Length: pdf.context.obj(contentBytes.length),
          });
          newStream.dict.delete(PDFName.of("Filter"));
          newStream.dict.delete(PDFName.of("DecodeParms"));
          const ref = pdf.context.register(newStream);
          page.node.set(PDFName.of("Contents"), ref);
        }
      }
    }
  } catch {}
  return removed;
}

// ---------- Strategy 6: repetition-based auto-detection ----------
// Analyze the first N pages, fingerprint every top-level q...Q graphics block,
// and find any block (image, form, text, or vector) that appears at roughly the
// same position on 80%+ of the sampled pages. The user confirms via preview,
// then we remove matches from every page in one pass.

export type WatermarkFingerprint = {
  kind: "xobject" | "text" | "vector";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WatermarkCandidate = {
  kind: "xobject" | "text" | "vector";
  id: string;
  count: number;
  sampled: number;
  avgX: number;
  avgY: number;
  avgW: number;
  avgH: number;
  sampleText?: string;
};

function fingerprintBlock(block: string): WatermarkFingerprint | null {
  // Read last cm matrix in the block (position + scale in the CTM).
  const cmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm/g;
  let a = 1,
    d = 1,
    e = 0,
    f = 0;
  let m: RegExpExecArray | null;
  while ((m = cmRe.exec(block)) !== null) {
    a = parseFloat(m[1]);
    d = parseFloat(m[4]);
    e = parseFloat(m[5]);
    f = parseFloat(m[6]);
  }

  // XObject draw (/Name Do).
  const doMatch = block.match(/\/([A-Za-z0-9_.+-]+)\s+Do\b/);
  if (doMatch) {
    return {
      kind: "xobject",
      id: doMatch[1],
      x: e,
      y: f,
      w: Math.abs(a),
      h: Math.abs(d),
    };
  }

  // Text.
  if (/\bBT\b/.test(block)) {
    const strings = extractShownStrings(block)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (strings.length === 0) return null;
    let tx = e;
    let ty = f;
    const btMatch = block.match(/BT\b([\s\S]*?)\bET\b/);
    if (btMatch) {
      const tmRe = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/g;
      let tm: RegExpExecArray | null;
      while ((tm = tmRe.exec(btMatch[1])) !== null) {
        tx = e + parseFloat(tm[5]);
        ty = f + parseFloat(tm[6]);
      }
    }
    return {
      kind: "text",
      id: strings.join("|"),
      x: tx,
      y: ty,
      w: 0,
      h: 0,
    };
  }

  // Vector paths (no text, no XObject).
  if (/\b[mcl]\b/.test(block)) {
    const opsMatch = block.match(/\b[mMlLcChHvVyYfFsSbBnW]\b/g) || [];
    const ops = opsMatch.join("");
    if (ops.length < 6) return null;
    let hash = 0;
    for (let i = 0; i < ops.length; i++) hash = ((hash << 5) - hash + ops.charCodeAt(i)) | 0;
    return {
      kind: "vector",
      id: `v${ops.length}_${hash}`,
      x: e,
      y: f,
      w: Math.abs(a),
      h: Math.abs(d),
    };
  }

  return null;
}

function forEachTopLevelBlock(content: string, cb: (block: string) => void): void {
  const tokens = content.split(/(\bq\b|\bQ\b)/);
  let depth = 0;
  let buf = "";
  for (const tok of tokens) {
    if (tok === "q") {
      if (depth === 0) buf = "";
      else buf += "q";
      depth++;
    } else if (tok === "Q") {
      depth--;
      if (depth <= 0) {
        cb(buf);
        buf = "";
        depth = 0;
      } else {
        buf += "Q";
      }
    } else if (depth > 0) {
      buf += tok;
    }
  }
}

function extractPageFingerprints(content: string): WatermarkFingerprint[] {
  const out: WatermarkFingerprint[] = [];
  forEachTopLevelBlock(content, (block) => {
    const fp = fingerprintBlock(block);
    if (fp) out.push(fp);
  });
  return out;
}

function findRepeatedCandidates(perPage: WatermarkFingerprint[][], threshold = 0.8): WatermarkCandidate[] {
  const sampled = perPage.length;
  if (sampled < 2) return [];

  const buckets = new Map<string, WatermarkFingerprint[]>();
  const pagesOf = new Map<string, Set<number>>();
  perPage.forEach((fps, pageIdx) => {
    const seenThisPage = new Set<string>();
    for (const fp of fps) {
      const key = `${fp.kind}:${fp.id}`;
      if (seenThisPage.has(key)) continue;
      seenThisPage.add(key);
      if (!buckets.has(key)) {
        buckets.set(key, []);
        pagesOf.set(key, new Set());
      }
      buckets.get(key)!.push(fp);
      pagesOf.get(key)!.add(pageIdx);
    }
  });

  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const results: WatermarkCandidate[] = [];
  for (const [key, fps] of buckets) {
    const pageSet = pagesOf.get(key)!;
    if (pageSet.size / sampled < threshold) continue;

    const xs = fps.map((f) => f.x);
    const ys = fps.map((f) => f.y);
    const xRange = Math.max(...xs) - Math.min(...xs);
    const yRange = Math.max(...ys) - Math.min(...ys);
    if (xRange > 40 || yRange > 40) continue;

    const kind = fps[0].kind;
    const id = fps[0].id;
    if (kind === "text" && id.replace(/[\s|]/g, "").length < 2) continue;

    results.push({
      kind,
      id,
      count: pageSet.size,
      sampled,
      avgX: avg(xs),
      avgY: avg(ys),
      avgW: avg(fps.map((f) => f.w)),
      avgH: avg(fps.map((f) => f.h)),
      sampleText: kind === "text" ? id.replace(/\|/g, " ") : undefined,
    });
  }

  return results
    .sort((a, b) => b.count - a.count || b.avgW * b.avgH - a.avgW * a.avgH)
    .slice(0, 3);
}

function matchesCandidate(fp: WatermarkFingerprint, c: WatermarkCandidate): boolean {
  if (fp.kind !== c.kind) return false;
  if (fp.id !== c.id) return false;
  if (Math.abs(fp.x - c.avgX) > 30) return false;
  if (Math.abs(fp.y - c.avgY) > 30) return false;
  return true;
}

function stripCandidateFromContent(content: string, cand: WatermarkCandidate): { out: string; removed: number } {
  let removed = 0;
  let out = "";
  const tokens = content.split(/(\bq\b|\bQ\b)/);
  let depth = 0;
  let buf = "";
  for (const tok of tokens) {
    if (tok === "q") {
      if (depth === 0) buf = "";
      else buf += "q";
      depth++;
    } else if (tok === "Q") {
      depth--;
      if (depth <= 0) {
        const fp = fingerprintBlock(buf);
        if (fp && matchesCandidate(fp, cand)) {
          removed++;
        } else {
          out += "q" + buf + "Q";
        }
        buf = "";
        depth = 0;
      } else {
        buf += "Q";
      }
    } else if (depth > 0) {
      buf += tok;
    } else {
      out += tok;
    }
  }
  return { out, removed };
}

async function scanForRepeatedWatermarks(
  bytes: ArrayBuffer,
): Promise<{ candidates: WatermarkCandidate[]; pageWidth: number; pageHeight: number }> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();
  const sampleCount = Math.min(5, pages.length);
  if (sampleCount < 2) return { candidates: [], pageWidth: 0, pageHeight: 0 };

  const perPage: WatermarkFingerprint[][] = [];
  for (let i = 0; i < sampleCount; i++) {
    const content = getPageContents(pages[i], pdf);
    perPage.push(content ? extractPageFingerprints(content) : []);
  }
  const candidates = findRepeatedCandidates(perPage, 0.8);
  const { width, height } = pages[0].getSize();
  return { candidates, pageWidth: width, pageHeight: height };
}

async function removeCandidateFromDoc(bytes: ArrayBuffer, cand: WatermarkCandidate): Promise<{ pdfBytes: Uint8Array; removed: number }> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();
  let totalRemoved = 0;

  pages.forEach((page: any) => {
    const content = getPageContents(page, pdf);
    if (!content) return;
    const { out, removed } = stripCandidateFromContent(content, cand);
    if (removed > 0) {
      totalRemoved += removed;
      const contentBytes = latin1ToBytes(out);
      const newStream = pdf.context.stream(contentBytes, {
        Length: pdf.context.obj(contentBytes.length),
      });
      newStream.dict.delete(PDFName.of("Filter"));
      newStream.dict.delete(PDFName.of("DecodeParms"));
      const ref = pdf.context.register(newStream);
      page.node.set(PDFName.of("Contents"), ref);
    }
  });

  // If it was an XObject, also delete it from every page's /Resources /XObject
  if (cand.kind === "xobject") {
    pages.forEach((page: any) => {
      try {
        const res = page.node.Resources();
        if (!res) return;
        const xobj = res.lookup(PDFName.of("XObject"));
        if (xobj instanceof PDFDict) {
          try {
            xobj.delete(PDFName.of(cand.id));
          } catch {}
        }
      } catch {}
    });
  }

  const pdfBytes = await pdf.save();
  return { pdfBytes, removed: totalRemoved };
}

async function renderCandidatePreview(bytes: ArrayBuffer, cand: WatermarkCandidate): Promise<string | null> {
  try {
    const pdfjsLib: any = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const page = await doc.getPage(1);
    const scale = 1.2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    // Overlay a red highlight rectangle at candidate location
    const x = cand.avgX * scale;
    const yPdf = cand.avgY * scale;
    const w = Math.max(40, cand.avgW * scale);
    const h = Math.max(40, cand.avgH * scale || 40);
    const yCanvas = canvas.height - yPdf - h;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, yCanvas, w, h);
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.fillRect(x, yCanvas, w, h);

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

// ---------- Pipeline (strategies 1-4) ----------

async function runStrategies1to3(bytes: ArrayBuffer): Promise<{ pdfBytes: Uint8Array; removed: number }> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();

  // Pass A: decode all page content streams.
  const pageContents: string[] = pages.map((p: any) => getPageContents(p, pdf));

  // Detect strings repeating across pages.
  const repeated = detectRepeatedStrings(pageContents);

  // Detect image XObject names referenced on any page (likely watermark).
  const perPageImages = pages.map((p: any) => collectXObjectNames(p));
  const imageFreq = new Map<string, number>();
  perPageImages.forEach((m) => {
    for (const [name, kind] of m) {
      if (kind === "Image") imageFreq.set(name, (imageFreq.get(name) ?? 0) + 1);
    }
  });
  const globalThreshold = 1; // detect image watermark on any page
  const globalWatermarkImages = new Set<string>();
  for (const [n, c] of imageFreq) if (c >= globalThreshold) globalWatermarkImages.add(n);

  let totalRemoved = 0;
  pages.forEach((page: any, i: number) => {
    // Strategy 3 — annotations
    totalRemoved += stripStampAnnots(page);

    // Strategy 4 — Word/Office watermark XObjects (headers)
    totalRemoved += stripWordWatermarkXObjects(page, pdf);

    let content = pageContents[i];
    const lowAlpha = findLowAlphaGStates(page);
    if (!content) return;

    // Strategy 5 — Word vector watermark Artifact BDC blocks
    const r5 = stripArtifactWatermarkBlocks(content, lowAlpha);
    content = r5.out;
    totalRemoved += r5.removed;

    // Strategy 1
    const r1 = stripWatermarkTextBlocks(content, repeated, lowAlpha);
    content = r1.out;
    totalRemoved += r1.removed;

    // Strategy 2
    const { width, height } = page.getSize();
    const imageNames = new Set<string>();
    for (const [n, k] of perPageImages[i]) if (k === "Image") imageNames.add(n);
    const r2 = stripLargeImageDraws(content, width, height, imageNames, globalWatermarkImages);
    content = r2.out;
    totalRemoved += r2.removed;

    if (r1.removed > 0 || r2.removed > 0) {
      const contentBytes = latin1ToBytes(content);
      const newStream = pdf.context.stream(contentBytes, {
        Length: pdf.context.obj(contentBytes.length),
      });
      newStream.dict.delete(PDFName.of("Filter"));
      newStream.dict.delete(PDFName.of("DecodeParms"));
      const ref = pdf.context.register(newStream);
      page.node.set(PDFName.of("Contents"), ref);
    }
  });

  const out = await pdf.save();
  return { pdfBytes: out, removed: totalRemoved };
}

// ---------- Strategy 4: raster rebuild ----------

async function runRasterRebuild(bytes: ArrayBuffer, onProgress: (pct: number) => void): Promise<Uint8Array> {
  const pdfjsLib: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
  const pdf = await loadingTask.promise;
  const newPdf = await PDFDocument.create();
  const scale = 2;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const jpgBytes = await (await fetch(dataUrl)).arrayBuffer();
    const img = await newPdf.embedJpg(jpgBytes);
    const w = viewport.width / scale;
    const h = viewport.height / scale;
    const p = newPdf.addPage([w, h]);
    p.drawImage(img, { x: 0, y: 0, width: w, height: h });
    onProgress(Math.round((i / pdf.numPages) * 100));
  }

  return await newPdf.save();
}

// ---------- Pixel-based auto-detection (definitive strategy) ----------

type WatermarkMask = {
  width: number;
  height: number;
  data: Uint8Array; // 1 = masked
  coveragePct: number;
  wmR: number;
  wmG: number;
  wmB: number;
};

async function loadPdfjs() {
  const pdfjsLib: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjsLib;
}

async function renderPageAt(pdf: any, pageNum: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(vp.width);
  canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return canvas;
}

function dilateMask(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dx = -r; dx <= r && !v; dx++) {
        const xi = x + dx;
        if (xi >= 0 && xi < w && src[y * w + xi]) v = 1;
      }
      tmp[y * w + x] = v;
    }
  }
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -r; dy <= r && !v; dy++) {
        const yi = y + dy;
        if (yi >= 0 && yi < h && tmp[yi * w + x]) v = 1;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

export type ScanResult = {
  mask: WatermarkMask | null;
  previewDataUrl: string;
  sampledPages: number;
  totalPages: number;
};

async function detectWatermarkMask(bytes: ArrayBuffer): Promise<ScanResult> {
  const pdfjsLib = await loadPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const total = pdf.numPages;

  // Pick sample pages: first, middle, last (dedup)
  const idxSet = new Set<number>([1]);
  if (total >= 2) idxSet.add(total);
  if (total >= 3) idxSet.add(Math.ceil(total / 2));
  const idxs = [...idxSet].sort((a, b) => a - b);

  // Compute scale so longest edge ~ 1400px (≈150 DPI at A4)
  const p1 = await pdf.getPage(1);
  const vpRaw = p1.getViewport({ scale: 1 });
  const scale = Math.min(2.2, 1400 / Math.max(vpRaw.width, vpRaw.height));
  const targetW = Math.ceil(vpRaw.width * scale);
  const targetH = Math.ceil(vpRaw.height * scale);

  // Render samples
  const canvases: HTMLCanvasElement[] = [];
  for (const i of idxs) {
    try {
      const c = await renderPageAt(pdf, i, scale);
      if (c.width === targetW && c.height === targetH) canvases.push(c);
    } catch {}
  }

  // Render preview base (page 1) — reuse first sample if available
  let previewCanvas = canvases[0];
  if (!previewCanvas) previewCanvas = await renderPageAt(pdf, 1, scale);

  if (canvases.length < 2) {
    return {
      mask: null,
      previewDataUrl: previewCanvas.toDataURL("image/jpeg", 0.85),
      sampledPages: canvases.length,
      totalPages: total,
    };
  }

  // Pixel-level intersection
  const datas = canvases.map((c) => c.getContext("2d")!.getImageData(0, 0, targetW, targetH).data);
  const N = targetW * targetH;
  const raw = new Uint8Array(N);
  const SIM_TH = 28; // max per-channel delta across pages
  const WM_MIN_LUMA = 140; // exclude dark ink (logo, borders, body text)
  const WM_MAX_LUMA = 228; // exclude paper white
  const NEUTRAL_TH = 25; // watermark tint must be near-neutral gray

  const inBand = (r: number, g: number, b: number): boolean => {
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma < WM_MIN_LUMA || luma > WM_MAX_LUMA) return false;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mx - mn > NEUTRAL_TH) return false;
    return true;
  };

  for (let p = 0; p < N; p++) {
    const off = p * 4;
    const r0 = datas[0][off];
    const g0 = datas[0][off + 1];
    const b0 = datas[0][off + 2];
    if (!inBand(r0, g0, b0)) continue;
    let ok = true;
    for (let s = 1; s < datas.length; s++) {
      const r = datas[s][off];
      const g = datas[s][off + 1];
      const b = datas[s][off + 2];
      if (!inBand(r, g, b)) {
        ok = false;
        break;
      }
      if (Math.abs(r - r0) > SIM_TH || Math.abs(g - g0) > SIM_TH || Math.abs(b - b0) > SIM_TH) {
        ok = false;
        break;
      }
    }
    if (ok) raw[p] = 1;
  }

  const dilated = dilateMask(raw, targetW, targetH, 1);
  let count = 0;
  for (let i = 0; i < N; i++) if (dilated[i]) count++;
  const coverage = count / N;

  // Sample average watermark color: pixels in raw mask whose 3x3 neighborhood
  // on other sample pages is near-white (i.e. watermark is over blank background).
  let sumR = 0, sumG = 0, sumB = 0, samples = 0;
  for (let p = 0; p < N && samples < 4000; p++) {
    if (!raw[p]) continue;
    const off = p * 4;
    // Prefer samples where at least one other page is near-white here (no text underneath)
    let cleanBg = false;
    for (let s = 1; s < datas.length; s++) {
      const r = datas[s][off], g = datas[s][off + 1], b = datas[s][off + 2];
      if (r > 235 && g > 235 && b > 235) { cleanBg = true; break; }
    }
    if (!cleanBg) continue;
    sumR += datas[0][off];
    sumG += datas[0][off + 1];
    sumB += datas[0][off + 2];
    samples++;
  }
  let wmR = 200, wmG = 200, wmB = 200;
  if (samples > 20) {
    wmR = sumR / samples;
    wmG = sumG / samples;
    wmB = sumB / samples;
  } else {
    // Fallback: average all masked pixels on page 0
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let p = 0; p < N; p++) {
      if (!raw[p]) continue;
      const off = p * 4;
      sr += datas[0][off]; sg += datas[0][off + 1]; sb += datas[0][off + 2]; n++;
    }
    if (n > 0) { wmR = sr / n; wmG = sg / n; wmB = sb / n; }
  }

  // Paint red overlay on preview
  const pctx = previewCanvas.getContext("2d")!;
  const img = pctx.getImageData(0, 0, targetW, targetH);
  const d = img.data;
  for (let p = 0; p < N; p++) {
    if (dilated[p]) {
      const off = p * 4;
      d[off] = Math.min(255, d[off] * 0.25 + 220);
      d[off + 1] = Math.floor(d[off + 1] * 0.25);
      d[off + 2] = Math.floor(d[off + 2] * 0.25);
    }
  }
  pctx.putImageData(img, 0, 0);
  const previewDataUrl = previewCanvas.toDataURL("image/jpeg", 0.85);

  // Guard against pathological masks
  const valid = coverage >= 0.0005 && coverage <= 0.35;
  return {
    mask: valid
      ? { width: targetW, height: targetH, data: dilated, coveragePct: coverage * 100, wmR, wmG, wmB }
      : null,
    previewDataUrl,
    sampledPages: canvases.length,
    totalPages: total,
  };
}

async function rebuildWithoutMask(
  bytes: ArrayBuffer,
  mask: WatermarkMask,
  onProgress: (pct: number) => void,
): Promise<Uint8Array> {
  const pdfjsLib = await loadPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vpRaw = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, 1400 / Math.max(vpRaw.width, vpRaw.height));
    const vp = page.getViewport({ scale });
    const w = Math.ceil(vp.width);
    const h = Math.ceil(vp.height);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const wmR = mask.wmR, wmG = mask.wmG, wmB = mask.wmB;
    const wmLum = 0.299 * wmR + 0.587 * wmG + 0.114 * wmB;
    const TOL2 = 32 * 32; // squared RGB distance for "matches watermark"
    const MARGIN = 22;    // luma below wm => underlying text, keep pixel

    const clean = (off: number) => {
      const r = d[off], g = d[off + 1], b = d[off + 2];
      const dr = r - wmR, dg = g - wmG, db = b - wmB;
      const dist2 = dr * dr + dg * dg + db * db;
      if (dist2 < TOL2) {
        // Pure watermark over background -> whiten
        d[off] = 255; d[off + 1] = 255; d[off + 2] = 255;
        return;
      }
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < wmLum - MARGIN) {
        // Text underneath the watermark: keep as-is (do not erase)
        return;
      }
      // Ambiguous / lighter than watermark -> whiten to remove residual
      d[off] = 255; d[off + 1] = 255; d[off + 2] = 255;
    };

    if (w === mask.width && h === mask.height) {
      for (let p = 0; p < mask.data.length; p++) {
        if (mask.data[p]) clean(p * 4);
      }
    } else {
      for (let y = 0; y < h; y++) {
        const my = Math.min(mask.height - 1, Math.floor((y / h) * mask.height));
        const rowM = my * mask.width;
        const rowD = y * w * 4;
        for (let x = 0; x < w; x++) {
          const mx = Math.min(mask.width - 1, Math.floor((x / w) * mask.width));
          if (mask.data[rowM + mx]) clean(rowD + x * 4);
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const jpgBytes = await (await fetch(dataUrl)).arrayBuffer();
    const jpg = await newPdf.embedJpg(jpgBytes);
    const pageW = vpRaw.width;
    const pageH = vpRaw.height;
    const outPage = newPdf.addPage([pageW, pageH]);
    outPage.drawImage(jpg, { x: 0, y: 0, width: pageW, height: pageH });
    onProgress(Math.round((i / pdf.numPages) * 100));
  }

  return await newPdf.save();
}


// ---------- Component ----------

function PdfWatermarkRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "scanning" | "preview" | "processing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const pendingBytesRef = useRef<ArrayBuffer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setStage("idle");
    setProgress(0);
    setError("");
    setDownloadUrl("");
    setScanResult(null);
    pendingBytesRef.current = null;
  };

  const onFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(f);
    setError("");
    setStage("idle");
    setProgress(0);
    setDownloadUrl("");
    setScanResult(null);
    pendingBytesRef.current = null;
  };

  const buildDownload = (bytes: Uint8Array, suffix: string) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name.replace(/\.pdf$/i, "") || "document") + suffix + ".pdf";
    a.click();
  };

  const run = async () => {
    if (!file) return;
    setError("");
    setStage("scanning");
    setProgress(20);
    try {
      const buf = await file.arrayBuffer();
      pendingBytesRef.current = buf;
      const result = await detectWatermarkMask(buf);
      setScanResult(result);
      setStage("preview");
      setProgress(0);
    } catch (e: any) {
      setError(e?.message || "Failed to scan the file.");
      setStage("idle");
    }
  };

  const confirmRemove = async () => {
    const buf = pendingBytesRef.current;
    const mask = scanResult?.mask;
    if (!buf || !mask) return;
    setStage("processing");
    setProgress(0);
    setError("");
    try {
      const bytes = await rebuildWithoutMask(buf, mask, (p) => setProgress(p));
      buildDownload(bytes, "-clean");
      setStage("done");
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "Failed to remove the watermark.");
      setStage("idle");
    }
  };

  const runFullFlatten = async () => {
    const buf = pendingBytesRef.current;
    if (!buf) return;
    setStage("processing");
    setProgress(0);
    setError("");
    try {
      // Flatten every page as image (no mask) — nukes stubborn embedded watermarks
      const bytes = await runRasterRebuild(buf, (p) => setProgress(p));
      buildDownload(bytes, "-flattened");
      setStage("done");
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "Failed to process the file.");
      setStage("idle");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const busy = stage === "processing" || stage === "scanning";

  return (
    <ToolPageShell
      title="PDF Watermark Remover"
      description="Remove watermarks from PDF files — fully in your browser, no uploads."
    >
      <div className="w-full max-w-2xl mx-auto space-y-5">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onFile(e.target.files[0]);
            }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-foreground font-medium text-sm">{file.name}</p>
              <p className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d1526] border border-border flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Drop a PDF file here or click to select</p>
            </div>
          )}
        </div>

        {busy && (
          <div className="bg-[#0d1526] border border-border rounded-2xl p-4 space-y-2">
            <p className="text-sm text-foreground">
              {stage === "scanning"
                ? "Scanning pages to auto-detect the watermark..."
                : `Rebuilding pages... ${progress}%`}
            </p>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {stage === "preview" && scanResult && (
          <div className="bg-[#0d1526] border border-cyan-500/40 rounded-2xl p-5 space-y-4">
            {scanResult.mask ? (
              <>
                <div className="space-y-1">
                  <p className="text-cyan-300 text-sm font-semibold">
                    Watermark detected on {scanResult.sampledPages} sampled page{scanResult.sampledPages === 1 ? "" : "s"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Highlighted in red on the preview below. Covers {scanResult.mask.coveragePct.toFixed(1)}% of the page. Click below to remove it from all {scanResult.totalPages} pages.
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border border-border bg-black/40 flex items-center justify-center">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img src={scanResult.previewDataUrl} alt="Detected watermark preview" className="max-h-[480px] w-auto" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={confirmRemove}
                    className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all"
                  >
                    Remove watermark from all pages
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-yellow-300 text-sm font-semibold">No repeating watermark detected</p>
                  <p className="text-muted-foreground text-xs">
                    We sampled {scanResult.sampledPages} of {scanResult.totalPages} page{scanResult.totalPages === 1 ? "" : "s"} and didn't find any element repeating at the same position. You can flatten every page as an image — this removes any visual watermark but the resulting text is no longer selectable.
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border border-border bg-black/40 flex items-center justify-center">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img src={scanResult.previewDataUrl} alt="Page preview" className="max-h-[400px] w-auto" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={runFullFlatten}
                    className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-all"
                  >
                    Flatten pages as images
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {stage === "done" && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <p className="text-green-400 text-sm">Processing complete. Your file is ready to download.</p>
          </div>
        )}

        {file && stage === "idle" && (
          <button
            onClick={run}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Scan &amp; Remove Watermark
          </button>
        )}

        {downloadUrl && stage === "done" && (
          <a
            href={downloadUrl}
            download={(file?.name.replace(/\.pdf$/i, "") || "document") + "-clean.pdf"}
            className="block w-full text-center py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all"
          >
            Download File
          </a>
        )}
      </div>



      <HowToUse
        steps={[
          "Upload your PDF by dragging it in or clicking to select a file.",
          "Click Remove Watermark — the tool automatically detects and removes text, image, and stamp watermarks.",
          "Download the cleaned file. If the watermark persists, try Advanced Mode which rebuilds every page as an image.",
        ]}
      />

      <ToolSeoContent
        title="PDF Watermark Remover Online Free — Remove Watermarks from PDF"
        description="Remove text, image, diagonal and stamp watermarks from PDF files for free, directly in your browser. Works on single-page and multi-page documents. No upload, no signup, 100% private."
        body={[
          "Skycally's PDF Watermark Remover automatically detects and removes three types of watermarks from PDF files: text overlays (including diagonal and rotated watermarks like DRAFT, CONFIDENTIAL, SAMPLE, and COPY), large background image watermarks, and stamp or annotation watermarks. All processing runs locally in your browser using pdf-lib — your document never leaves your device.",
          "The tool works by parsing the PDF content streams directly and identifying elements that match watermark patterns: text blocks with rotated transformation matrices (the diagonal text typical of most watermarks), elements with low opacity or transparency, text matching common watermark keywords, and images covering more than 40% of the page area. Matching elements are surgically removed from the page content while leaving all other text, images, and formatting intact.",
          "When a watermark is embedded so deeply into the page content that it cannot be removed structurally — common with some PDF generators that merge the watermark directly into the base content layer — Advanced Mode is available. Advanced Mode rasterizes each page at 2× resolution using pdfjs-dist, then rebuilds the PDF from high-quality JPEG images. The watermark disappears completely, but the resulting text is no longer selectable or searchable.",
          "This tool is useful for removing watermarks from documents you have legitimate rights to edit — such as trial software exports, draft documents you authored, or PDFs where you need to remove a watermark you added yourself. Always ensure you have the legal right to modify a document before removing its watermark.",
        ]}
        faqs={[
          {
            question: "What types of watermarks can be removed?",
            answer:
              "The tool removes three types: (1) text watermarks including diagonal overlays, DRAFT/CONFIDENTIAL/SAMPLE/COPY text, and repeated text patterns; (2) large image watermarks covering more than 40% of the page; (3) stamp and annotation watermarks added via PDF annotation layers. Watermarks that are part of scanned page images require Advanced Mode.",
          },
          {
            question: "Why wasn't my watermark detected?",
            answer:
              "Some PDFs embed watermarks directly into the base content layer without rotation or transparency — making them structurally identical to regular content. In this case, use Advanced Mode, which bypasses structure analysis entirely and renders each page visually, then rebuilds the PDF from images. The watermark disappears but text becomes non-selectable.",
          },
          {
            question: "Does it work on single-page PDFs?",
            answer:
              "Yes. The tool detects watermarks on any number of pages — including single-page documents. Detection does not require the watermark to appear on multiple pages.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer:
              "No. All processing happens locally in your browser using pdf-lib and pdfjs-dist (WebAssembly). Your file never leaves your device, making this tool safe for confidential contracts, invoices, and sensitive documents.",
          },
          {
            question: "Will the output PDF have selectable text?",
            answer:
              "Yes, in the default mode — the PDF is rebuilt preserving all original text, fonts, vectors, and images. Only the watermark elements are removed. In Advanced Mode, pages are converted to images and text selection is lost.",
          },
          {
            question: "What is Advanced Mode?",
            answer:
              "Advanced Mode renders each page at 2× screen resolution using pdfjs-dist, captures it as a high-quality image, and rebuilds the PDF from those images. This removes any visual watermark regardless of how it was embedded, but the output PDF no longer has selectable or searchable text.",
          },
          {
            question: "Can it remove diagonal watermarks?",
            answer:
              "Yes. Diagonal watermarks use a rotation transformation matrix in the PDF content stream (a non-zero b or c value in the cm or Tm matrix). The tool detects any text block with a rotation angle and flags it as a likely watermark for removal.",
          },
          {
            question: "Does it work on password-protected PDFs?",
            answer:
              "The tool attempts to open password-protected PDFs in read mode (ignoreEncryption: true), which works for some protection levels. Strongly encrypted PDFs may fail to open. If you receive an error, you will need to remove the password protection first using your PDF reader.",
          },
        ]}
      />

      <RelatedTools currentSlug="pdf-watermark-remover" />
    </ToolPageShell>
  );
}
