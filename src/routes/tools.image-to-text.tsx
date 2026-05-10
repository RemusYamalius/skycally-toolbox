import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { Textarea } from "@/components/ui/textarea";
import { checkSize, downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/image-to-text")({
  head: () => ({
    meta: [
      { title: "Image to Text (OCR) — Skycally" },
      { name: "description", content: "Extract text from images in English, Arabic, French and Spanish — fully in your browser." },
      { property: "og:title", content: "Image to Text · Skycally" },
      { property: "og:description", content: "Free OCR tool — extract text from any image." },
    ],
  }),
  component: ImageToTextPage,
});

const LANGS = [
  { code: "eng", label: "English" },
  { code: "ara", label: "Arabic" },
  { code: "fra", label: "French" },
  { code: "spa", label: "Spanish" },
];

function ImageToTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("eng");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFile = (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setText("");
    setProgress(0);
  };

  const extract = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setText("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(data.text || "");
      toast.success("Text extracted");
    } catch (e: any) {
      toast.error(e?.message || "OCR failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const name = (file?.name || "extracted").replace(/\.[^.]+$/, "") + ".txt";
    downloadBlob(blob, name);
  };

  return (
    <ToolPageShell title="Image to Text (OCR)" description="Extract text from any image — supports English, Arabic, French and Spanish.">
      {!file ? (
        <DropZone accept="image/png,image/jpeg,image/webp" onFiles={onFile} hint="PNG, JPG, WEBP, up to 10MB" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => { setFile(null); setText(""); }} className="text-sm text-muted-foreground hover:text-foreground shrink-0">Change</button>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">Language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          <button onClick={extract} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting... {progress}%</> : "Extract Text"}
          </button>

          {busy && (
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--cyan-brand)" }} />
            </div>
          )}

          {text && (
            <>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} dir="auto" className="min-h-[280px] font-mono text-sm" />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-muted-foreground">{text.length.toLocaleString()} characters</p>
                <div className="flex gap-3">
                  <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5">
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 hover:bg-secondary">
                    <Download className="w-4 h-4" /> Download .txt
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ADSENSE_ZONE: image-to-text-bottom 728x90 */}
      <AdZone id="image-to-text-bottom" size="728x90" />

      <HowToUse steps={[
        "Drop an image (PNG, JPG, or WEBP).",
        "Pick the language and click Extract Text.",
        "Copy the result or download as a .txt file.",
      ]} />
          <ToolSeoContent
        title={"Image to Text — Free Online OCR Tool"}
        description={"Extract text from images using OCR technology. Supports English, Arabic, French and Spanish. Works in your browser with Tesseract.js. No upload needed."}
        body={[
        "Upload any image containing text — photos of documents, screenshots, scanned pages or handwritten notes — and our OCR engine will extract the readable text content. Select your language for the most accurate results.",
        "Text extraction uses Tesseract.js, an industry-standard open-source OCR engine running in your browser. Processing may take 10-30 seconds depending on image size and complexity. Your images never leave your device.",
      ]}
        faqs={[
        { question: "What languages does the OCR support?", answer: "We currently support English, Arabic, French and Spanish. Select the language of your image text for the most accurate extraction." },
        { question: "Does it work with handwritten text?", answer: "OCR works best with printed text. Handwriting recognition is possible but accuracy varies significantly based on writing clarity." },
        { question: "Why is text extraction slow?", answer: "Tesseract.js downloads a language model (2-5MB) on first use and processes images locally. This takes 15-30 seconds. Subsequent extractions are faster." },
        { question: "What image quality gives the best results?", answer: "High contrast images with clear, sharp text give the best results. Minimum 300 DPI for scanned documents. Avoid blurry, skewed or very small text." },
      ]}
      />
      </ToolPageShell>
  );
}
