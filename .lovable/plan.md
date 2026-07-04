# Plan: Smart Watermark Auto-Detection (Strategy 6)

## Problem
Current strategies (1-5) rely on fixed patterns: rotation, low opacity, keywords, `/Artifact` blocks, and Form XObjects named "Watermark". Many real PDFs (especially exported from LightPDF, Unwatermark.ai targets, custom exporters, scanned + stamped docs) use watermarks that don't match any of these signatures — they're just an image or text drawn identically on every page. Detection fails silently, nothing gets removed.

## Solution — Repetition-Based Detection with Preview
Add a **Strategy 6** that runs **before** strategies 1-5. It analyzes the first 5 pages, finds any drawing element (image XObject, Form XObject, or text block) that appears at approximately the same position on ≥ 80% of sampled pages, shows the candidates to the user as a visual preview, and on confirmation removes them from **all** pages in one pass.

## User Flow
```text
[Upload PDF]
     ↓
[Auto-Scan first 5 pages]          ← Strategy 6 detection
     ↓
Found repeated element?
   ├─ YES → [Preview Modal]
   │         "We found this repeating element on 5/5 pages.
   │          Is this the watermark you want to remove?"
   │         ┌──────────────────┐
   │         │  🖼️ thumbnail    │   [✓ Remove it]
   │         │  or text snippet │   [✗ Not a watermark]
   │         └──────────────────┘   [Try manual detection]
   │
   └─ NO  → Fall back to Strategies 1-5 automatically
```

If the user confirms → remove the confirmed element(s) from every page and download.
If the user rejects → run Strategies 1-5 as today.

## Detection Algorithm
For each of the first `min(5, pageCount)` pages:
1. Walk the content stream, splitting into `q ... Q` graphics blocks (reuse existing stack parser).
2. For each block, extract a **fingerprint**:
   - **XObject block**: `{ kind: "xobject", name, x, y, w, h }` from the last `cm` matrix + `/Name Do`.
   - **Text block**: `{ kind: "text", strings: shown[], x, y }` from `BT ... ET`.
   - **Vector block** (paths only, no BT): `{ kind: "vector", bbox, hash }` — hash the path operators.
3. Bucket fingerprints across pages by:
   - Same `kind` + same `name`/`strings`/`hash`
   - Position match: `|Δx| < 20pt` AND `|Δy| < 20pt` (tolerates small page-to-page jitter)
4. Any bucket with `count / sampledPages ≥ 0.8` becomes a **watermark candidate**.
5. Rank candidates by (repetition count desc, then size desc). Show top 3 max.

## Preview Rendering
- **Image / Form XObject candidate**: render just that XObject to a canvas thumbnail using `pdfjs-dist` (already in the project via other PDF tools) at ~200×200. Show it in the modal.
- **Text candidate**: show the extracted string(s) as a styled quote, e.g. `"CONFIDENTIAL"`.
- **Vector candidate**: render the bbox area of page 1 cropped to that region.

## Removal
When user confirms candidate `C`:
- For every page in the doc, walk `q ... Q` blocks and drop any block whose fingerprint matches `C` (same name / same text / same path hash + position within tolerance).
- Re-encode the content stream (reuse existing `latin1ToBytes` + `pdf.context.stream` path from Strategy 4).
- If candidate is a Form XObject, also delete it from `/Resources /XObject`.
- Report `removed` count in the existing status UI.

## Files to Change
- **`src/routes/tools.pdf-watermark-remover.tsx`** (single file, all logic lives here today):
  - Add new helpers near the top of the strategies section:
    - `extractPageFingerprints(page, pdf, content) → Fingerprint[]`
    - `findRepeatedCandidates(perPageFingerprints, threshold=0.8) → Candidate[]`
    - `renderCandidateThumbnail(pdf, candidate) → Promise<string>` (data URL via pdfjs)
    - `removeCandidateFromAllPages(pdf, candidate) → number`
  - Refactor the run pipeline:
    1. Load PDF, scan first 5 pages → candidates.
    2. If candidates found → set React state to open a **`<WatermarkPreviewDialog />`** (new inline component using existing `@/components/ui/dialog`).
    3. On confirm → call `removeCandidateFromAllPages`, then save + download.
    4. On reject → continue to `runStrategies1to3` (existing) + strategies 4/5.
  - Add state: `candidates`, `showPreview`, `pendingPdf`, `pendingBytes`.

## Technical Notes
- No new npm packages. `pdf-lib` handles parsing/writing; `pdfjs-dist` is already in the project for thumbnail rendering (used by pdf-reader / pdf-to-images tools).
- Position tolerance `20pt` handles Word/LibreOffice re-flow between pages.
- Threshold `0.8` matches LightPDF/Unwatermark heuristics; single-page PDFs skip Strategy 6 and go straight to 1-5.
- All-client-side, no server calls — keeps the tool's "your file never leaves your device" guarantee.
- English-only UI copy (per project memory).

## Out of Scope
- Rasterizing every page to run pixel-diff detection (too slow, memory-heavy in browser).
- OCR-based watermark text detection.
- Multiple simultaneous watermark removal in one confirmation (user picks one at a time; can re-run tool if needed).

## Success Criteria
1. On a PDF where every page has the same centered image, Strategy 6 detects it, previews it, and removes it on confirmation — even when opacity is 1.0 and no keyword matches.
2. On a PDF with no repeating elements, Strategy 6 is silent and strategies 1-5 run unchanged.
3. User can reject the preview and still get the old behavior.
