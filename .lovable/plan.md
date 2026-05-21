## Goal

Fix the PDF Watermark Remover so the strategies actually mutate the PDF. Root cause: `p.node.normalizedEntries().Contents` returns nothing (or an unresolved ref) on most real-world PDFs, so `pageContents[i]` is empty and Strategies 1 and 2 short-circuit at `if (!content) return;`.

## Changes (single file: `src/routes/tools.pdf-watermark-remover.tsx`)

1. **Add helper `getPageContents(page, pdf)`** above `runStrategies1to3`. Uses `page.node.get(PDFName.of("Contents")) ?? page.node.lookup(PDFName.of("Contents"))`, resolves a top-level `PDFRef` that may point to either a stream or a `PDFArray` of stream refs, then decodes each stream via the existing `decodeStreamBytes` + `bytesToLatin1` and joins with `"\n"`. Wrapped in try/catch returning `""`.

2. **Replace the inline `pages.map` block** in `runStrategies1to3` (lines 253–267) with:
   ```ts
   const pageContents: string[] = pages.map((p: any) => getPageContents(p, pdf));
   ```

3. **Temporary debug log** inside the per-page loop, right after computing `lowAlpha`:
   ```ts
   console.log(`[WatermarkRemover] Page ${i+1}: content length=${pageContents[i].length}, repeated=${repeated.size}, lowAlpha=${lowAlpha.size}`);
   ```
   Labeled `// TODO: remove after verifying` so it's easy to strip later.

4. **Bug 2 verification only — no code change.** `stripStampAnnots` already mutates `page.node` directly via `page.node.set(PDFName.of("Annots"), …)`, and `await pdf.save()` at the end serializes the whole document including those node mutations. The existing `if (r1.removed > 0 || r2.removed > 0)` guard correctly applies only to the *content stream* rewrite (it would be wrong to write back an unchanged stream as a fresh object). No change needed here.

## Out of scope

UI, styles, other tools, file structure, strategy detection heuristics — all untouched.

## Verification

After the edit, load a watermarked PDF in the preview, open devtools, and confirm the `[WatermarkRemover]` logs show non-zero `content length` per page. If repeated/lowAlpha counts are also non-zero on a known watermarked file, the bug is fixed.
