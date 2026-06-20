import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
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
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/image-to-text")({
  head: () => buildToolMeta(toolBySlug("image-to-text", tools)),
  component: ImageToTextPage,
});

const LANGS = [
  { code: "eng", label: "English" },
  { code: "ara", label: "Arabic" },
  { code: "fra", label: "French" },
  { code: "spa", label: "Spanish" },
  { code: "deu", label: "German" },
  { code: "por", label: "Portuguese" },
  { code: "ita", label: "Italian" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
];

function ImageToTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lang, setLang] = useState("eng");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFile = (files: File[]) => {
    const f = files[0];
    const err = checkSize(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setText("");
    setProgress(0);
    setPreview(URL.createObjectURL(f));
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
      toast.success("Text extracted successfully");
    } catch (e: any) {
      toast.error(e?.message || "OCR failed — please try a clearer image");
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

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setText("");
    setProgress(0);
  };

  return (
    <ToolPageShell
      title="Image to Text (OCR)"
      description="Extract text from any image instantly. Supports English, Arabic, French, Spanish and more."
    >
      {!file ? (
        <DropZone accept="image/png,image/jpeg,image/webp" onFiles={onFile} hint="PNG, JPG, WEBP — up to 10 MB" />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          {/* File info + preview */}
          <div className="flex items-start gap-4">
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 object-cover rounded-xl border border-border shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground shrink-0">
              Change
            </button>
          </div>

          {/* Language */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Extract button */}
          <button
            onClick={extract}
            disabled={busy}
            className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting... {progress}%
              </>
            ) : (
              "Extract Text"
            )}
          </button>

          {/* Progress bar */}
          {busy && (
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "var(--cyan-brand)" }}
              />
            </div>
          )}

          {/* Result */}
          {text && (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                dir="auto"
                className="min-h-[280px] font-mono text-sm"
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-muted-foreground">
                  {text.length.toLocaleString()} characters ·{" "}
                  {text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button
                    onClick={download}
                    className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 hover:bg-secondary"
                  >
                    <Download className="w-4 h-4" /> Download .txt
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AdZone id="image-to-text-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Drop an image (PNG, JPG, or WebP) containing printed or typed text.",
          "Select the language of the text in the image for best accuracy.",
          "Click Extract Text, then copy the result or download it as a .txt file.",
        ]}
      />

      <ToolSeoContent
        title="Image to Text — Free Online OCR Tool (No Upload Required)"
        description="Extract text from images, screenshots, scanned documents and PDFs using OCR. Supports English, Arabic, French, Spanish, German and more. Runs in your browser — your files never leave your device."
        body={[
          "Skycally's Image to Text tool uses Tesseract.js, the industry-standard open-source OCR (Optical Character Recognition) engine, running entirely in your browser. Whether you have a scanned document, a screenshot with text, a photo of a sign, or a receipt — paste the image and extract all readable text in seconds. Your files never leave your device.",
          "OCR accuracy depends heavily on image quality. For best results, use high-resolution images (300 DPI or higher for scanned documents), ensure good contrast between text and background, and avoid blurry or heavily compressed images. Printed text extracts with near-perfect accuracy; handwriting varies significantly based on clarity and style.",
          "Selecting the correct language is critical for accuracy. Each language uses a different trained model that understands the character shapes, spacing, and patterns of that script. Using the wrong language model will produce garbled output — especially important for Arabic and Chinese, which use non-Latin scripts. The language model (2–5 MB) is downloaded once and cached in your browser.",
          "The extracted text is fully editable in the text area before you copy or download it — useful for correcting any OCR errors before using the text in a document or email. The word and character count updates live as you edit.",
        ]}
        faqs={[
          {
            question: "What languages does the OCR support?",
            answer:
              "English, Arabic, French, Spanish, German, Portuguese, Italian, and Chinese (Simplified). Select the language matching your image for the most accurate results. More languages can be added on request.",
          },
          {
            question: "Does my image get uploaded to a server?",
            answer:
              "No. All OCR processing runs locally in your browser using Tesseract.js. Your images are never uploaded, stored, or transmitted anywhere. This makes it one of the most private OCR tools available.",
          },
          {
            question: "Why is text extraction slow?",
            answer:
              "Tesseract.js downloads a language model (2–5 MB) on first use, which takes a few seconds depending on your connection. After that, processing a typical image takes 10–30 seconds. Larger or more complex images take longer. Subsequent uses in the same session are faster as the model is cached.",
          },
          {
            question: "What image quality gives the best OCR results?",
            answer:
              "High contrast, sharp, well-lit images with clearly readable text give the best results. For scanned documents, 300 DPI or higher is recommended. Avoid blurry, skewed, rotated, or very small text. Dark background with light text works as well as the reverse.",
          },
          {
            question: "Does it work with handwritten text?",
            answer:
              "OCR works best with printed or typed text. Handwriting recognition is possible but accuracy varies significantly based on writing clarity, style, and consistency. Neat, clearly separated handwriting extracts better than cursive.",
          },
          {
            question: "Can I extract text from a PDF?",
            answer:
              "This tool works with image files (PNG, JPG, WebP). If your PDF contains scanned pages, take a screenshot of each page and use it as input. For text-based PDFs, a dedicated PDF tool is more appropriate.",
          },
          {
            question: "Can I edit the extracted text?",
            answer:
              "Yes. The extracted text appears in an editable text area — you can correct any OCR errors before copying or downloading. Changes are reflected in the character and word count displayed below the text area.",
          },
          {
            question: "What is OCR?",
            answer:
              "OCR stands for Optical Character Recognition — the technology that converts images of text into machine-readable text. It works by analysing pixel patterns in the image and matching them to known character shapes using a trained language model.",
          },
        ]}
      />

      <RelatedTools currentSlug="image-to-text" />
    </ToolPageShell>
  );
}
