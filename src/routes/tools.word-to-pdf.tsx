import { createFileRoute } from "@tanstack/react-router";
import { MockConvert } from "@/components/mock-convert";

export const Route = createFileRoute("/tools/word-to-pdf")({
  head: () => ({
    meta: [
      { title: "Word to PDF — Convert documents · Skycally" },
      { name: "description", content: "Turn Word documents into polished PDFs in your browser." },
      { property: "og:title", content: "Word to PDF · Skycally" },
      { property: "og:description", content: "Convert Word to PDF instantly." },
    ],
  }),
  component: () => <MockConvert title="Word to PDF" description="Upload a Word document and get a polished PDF." accept=".doc,.docx,application/msword" outName={(n) => n.replace(/\.(docx?|DOCX?)$/i, ".pdf")} />,
});
