import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Shield } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob, formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/protect-pdf")({
  head: () => buildToolMeta(toolBySlug("protect-pdf", tools)),
  component: ProtectPdfPage,
});

function randomOwnerPassword(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function ProtectPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
  };

  const protect = async () => {
    if (!file) return;
    if (pw.length < 4) { toast.error("Password must be at least 4 characters"); return; }
    if (pw !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    try {
      const { PDFDocument } = await import("@cantoo/pdf-lib");
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const bytes = await pdfDoc.save({
        userPassword: pw,
        ownerPassword: randomOwnerPassword(),
        permissions: {
          printing: "highResolution",
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        },
      } as any);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-protected.pdf";
      downloadBlob(blob, name);
      toast.success("Protected PDF ready!");
    } catch (e) {
      console.error(e);
      toast.error("Could not protect this PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell title="Protect PDF" description="Add a password to your PDF to keep it private and prevent unauthorized access.">
      <div className="space-y-5">
        <DropZone accept="application/pdf" onFiles={onFiles} label="Drop a PDF here" hint="or click to browse" />

        {file && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => setFile(null)} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary shrink-0">Remove</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Set password</label>
                <div className="relative">
                  <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 pr-10 text-sm" placeholder="Choose a password" />
                  <button onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Confirm password</label>
                <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Repeat the password" />
              </div>
            </div>

            <button onClick={protect} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-50">
              <Shield className="w-4 h-4" /> {busy ? "Protecting…" : "Protect & download"}
            </button>
          </div>
        )}
      </div>

      <HowToUse steps={[
        "Upload the PDF you want to protect.",
        "Enter and confirm your desired password.",
        "Click Protect and download your password-secured PDF.",
      ]} />
      <RelatedTools currentSlug="protect-pdf" />
      <ToolSeoContent
        title="Protect PDF with Password — Free Online Tool"
        description="Encrypt any PDF with a password, right in your browser. Stop unauthorized viewing, copying and editing."
        body={[
          "Skycally's Protect PDF tool encrypts your PDF with a user password, so anyone who tries to open it must enter the password first. We also generate a strong random owner password under the hood and lock down editing, content copying, and document assembly — while still allowing high-quality printing for legitimate users.",
          "Encryption happens entirely in your browser using a maintained fork of pdf-lib. Your file is never uploaded, never logged, and never seen by us. That makes the tool safe for sharing sensitive contracts, statements, identity documents, and internal reports.",
        ]}
        faqs={[
          { question: "What encryption is used?", answer: "Standard PDF password encryption is applied to the document. Anyone opening the file in Acrobat, Preview, or any modern PDF reader will be prompted for the password." },
          { question: "Can I remove the password later?", answer: "Yes, by re-saving the PDF after opening it with the password in a tool that supports decryption. We don't keep a copy on our side." },
          { question: "Is my file uploaded to your servers?", answer: "No. Encryption happens locally in your browser — the PDF never leaves your device." },
          { question: "What happens if I forget the password?", answer: "There is no recovery. Choose a password you can remember or store it in a password manager." },
        ]}
      />
    </ToolPageShell>
  );
}
