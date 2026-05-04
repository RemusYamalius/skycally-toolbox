import { createFileRoute } from "@tanstack/react-router";
import { MockConvert } from "@/components/mock-convert";

export const Route = createFileRoute("/tools/pdf-to-word")({
  head: () => ({
    meta: [
      { title: "PDF to Word — Convert PDF documents · Skycally" },
      { name: "description", content: "Turn PDFs into editable Word documents securely in your browser." },
      { property: "og:title", content: "PDF to Word · Skycally" },
      { property: "og:description", content: "Convert PDF to editable Word files." },
    ],
  }),
  component: () => <MockConvert title="PDF to Word" description="Upload a PDF and get an editable Word document." accept="application/pdf" outName={(n) => n.replace(/\.pdf$/i, ".docx")} />,
});
