import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { AlertCircle } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/word-to-pdf")({
  head: () => buildToolMeta(toolBySlug("word-to-pdf", tools)),
  component: WordToPdf,
});

function WordToPdf() {
  return (
    <ToolPageShell title="Word to PDF" description="Convert Word documents to PDF.">
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="font-display text-xl font-bold">Temporarily unavailable</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The Word to PDF converter relied on a backend service that has been retired. As a workaround,
          use Microsoft Word's built-in "Save As PDF" or Google Docs' "Download as PDF" feature.
        </p>
      </div>

      <HowToUse steps={[
        "This tool is temporarily offline.",
        "Use your word processor's built-in PDF export as a workaround.",
        "Check back soon for a browser-based replacement.",
      ]} />
      <RelatedTools currentSlug="word-to-pdf" />
      <ToolSeoContent
        title={"Word to PDF Converter — Skycally"}
        description={"Skycally's Word to PDF converter is temporarily unavailable while we move to a fully browser-based pipeline."}
        body={[
          "We're rebuilding our Word to PDF converter to run entirely in your browser, with no server uploads required.",
          "In the meantime, Microsoft Word, LibreOffice Writer, and Google Docs all include a built-in PDF export that handles DOC and DOCX files locally on your device.",
        ]}
        faqs={[
          { question: "When will the converter come back?", answer: "We're working on a fully browser-based replacement. No date yet — check back soon." },
          { question: "Why was it taken offline?", answer: "The backend service it relied on has been retired so we can focus on tools that run entirely on your device." },
          { question: "What can I use in the meantime?", answer: "Microsoft Word, LibreOffice Writer and Google Docs all export to PDF directly." },
          { question: "Will Arabic and RTL languages be supported?", answer: "Yes — full RTL and Arabic support is a requirement for the replacement." },
        ]}
      />
    </ToolPageShell>
  );
}
