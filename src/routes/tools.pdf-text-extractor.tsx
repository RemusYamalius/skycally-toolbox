import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Download } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone, formatBytes } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { Textarea } from "@/components/ui/textarea";
import { AdZone } from "@/components/ad-zone";
import { checkSize, downloadBlob } from "@/lib/file-utils";
import ToolSeoContent from "@/components/tool-seo-content";

export const Route = createFileRoute("/tools/pdf-text-extractor")({
  head: () => buildToolMeta(toolBySlug("pdf-text-extractor", tools)),}</p>
            </div>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Change</button>
          </div>

          {busy ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Extracting text...
            </div>
          ) : (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                dir="auto"
                className="min-h-[360px] font-mono text-sm"
                placeholder="Extracted text will appear here..."
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-muted-foreground">{text.length.toLocaleString()} characters</p>
                <div className="flex gap-3">
                  <button onClick={copy} disabled={!text} className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background font-semibold px-4 py-2.5 disabled:opacity-50">
                    <Copy className="w-4 h-4" /> Copy All Text
                  </button>
                  <button onClick={download} disabled={!text} className="inline-flex items-center gap-2 rounded-xl border border-border font-semibold px-4 py-2.5 disabled:opacity-50 hover:bg-secondary">
                    <Download className="w-4 h-4" /> Download .txt
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ADSENSE_ZONE: pdf-text-extractor-bottom 728x90 */}
      <AdZone id="pdf-text-extractor-bottom" size="728x90" />

      <HowToUse steps={[
        "Drop your PDF file (up to 10MB).",
        "We extract the text instantly in your browser.",
        "Copy the result or download it as a .txt file.",
      ]} />
          <ToolSeoContent
        title={"Extract Text from PDF Free — Online PDF Text Extractor"}
        description={"Extract all text content from any PDF file instantly. Copy or download as TXT. Supports all languages. Works entirely in your browser — no upload needed."}
        body={[
        "Upload any PDF and instantly extract all readable text content. The extracted text is displayed in a clean textarea where you can review, copy or download it as a text file. Page numbers are shown for easy navigation.",
        "Text extraction uses PDF.js running in your browser — the same technology used by Mozilla Firefox to display PDFs. Your document never leaves your device.",
      ]}
        faqs={[
        { question: "What types of PDFs can I extract text from?", answer: "Text extraction works with digitally created PDFs (Word exports, generated PDFs). Scanned PDFs (images of text) require OCR — try our Image to Text tool instead." },
        { question: "Does it support Arabic and other languages?", answer: "Yes, text extraction supports all languages including Arabic, Chinese, Japanese and any other language present in the PDF." },
        { question: "Will the formatting be preserved?", answer: "Plain text is extracted without formatting. Tables may appear as space-separated columns, and some layout elements may not translate perfectly to plain text." },
        { question: "Can I extract text from a password-protected PDF?", answer: "No. You need to remove password protection first before extracting text." },
      ]}
      />
      </ToolPageShell>
  );
}
