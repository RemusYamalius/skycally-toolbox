## Fix PDF Watermark Remover — 3 root cause bugs

Single file: `src/routes/tools.pdf-watermark-remover.tsx`

### Bug 1 — Stack-based parser for nested q...Q blocks
Replace the current regex-based `stripWatermarkTextBlocks` with the stack-based parser from the spec. Keeps helpers `isRotated`, `hasLowAlpha`, `matchesTargets`, adds `isWatermarkBlock`. Tokenizes on `\bq\b|\bQ\b`, uses a stack to correctly drop entire nested watermark blocks without orphaning `Q` operators. After the q/Q pass, runs a standalone `BT...ET` sweep on the remainder.

### Bug 2 — Explicit /Length on new content stream
In `runStrategies1to3`, where the rewritten content is committed:
- Build `contentBytes` once.
- Create stream via `pdf.context.stream(contentBytes, { Length: pdf.context.obj(contentBytes.length) })`.
- Then `newStream.dict.delete(PDFName.of("Filter"))` and `newStream.dict.delete(PDFName.of("DecodeParms"))` to prevent double-decoding from any inherited filter entries.
- Ensure `PDFName` is imported from `pdf-lib` (add to existing import if missing).

### Bug 3 — Robust `decodeStreamBytes` fallback chain
Replace the body of `decodeStreamBytes` with the 4-step fallback: `getUnencodedContents` → `getContents` → `stream.contents` (Uint8Array) → `asPDFStream().contents`. Each wrapped in try/catch; returns `new Uint8Array()` only if all fail.

### Out of scope
UI, styles, copy, other tools, other strategies, file layout.

### Verification
Upload (a) PDF with watermark wrapped in nested `q q BT...ET Q Q`, (b) PDF that previously produced corrupted output, (c) compressed FlateDecode content streams. Confirm `removed > 0`, downloaded PDF opens cleanly in a viewer, no orphaned `Q` operators in output.
