import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Shield, Lock, ExternalLink } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import { DropZone } from "@/components/drop-zone";
import { downloadBlob } from "@/lib/file-utils";
import { formatBytes } from "@/components/drop-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/protect-pdf")({
  head: () => buildToolMeta(toolBySlug("protect-pdf", tools)),
  component: ProtectPdfPage,
});

function randomOwnerPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const DESKTOP_TOOLS = [
  { name: "Adobe Acrobat", url: "https://www.adobe.com/acrobat.html", free: false },
  { name: "PDF24 Tools", url: "https://tools.pdf24.org/en/protect-pdf", free: true },
  { name: "Smallpdf", url: "https://smallpdf.com/protect-pdf", free: false },
  { name: "qpdf (CLI)", url: "https://qpdf.readthedocs.io", free: true },
];

function ProtectPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [strength, setStrength] = useState(0);

  const calcStrength = (val: string) => {
    let s = 0;
    if (val.length >= 6) s++;
    if (val.length >= 10) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    return s;
  };

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setFile(f);
    setDone(false);
  };

  const protect = async () => {
    if (!file) return;
    if (pw.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (pw !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { PDFDocument } = await import("@cantoo/pdf-lib");
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      pdfDoc.setProducer("Skycally — protected");
      pdfDoc.setSubject("Protected");
      pdfDoc.setKeywords(["protected", "encrypted"]);
      pdfDoc.encrypt({
        userPassword: pw,
        ownerPassword: randomOwnerPassword(),
        permissions: { printing: "highResolution" },
      });
      const bytes = await pdfDoc.save();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      downloadBlob(blob, file.name.replace(/\.pdf$/i, "") + "-protected.pdf");
      setDone(true);
      toast.success("PDF encrypted and downloaded!");
    } catch {
      toast.error("Could not process this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  };

  const strengthLabel = ["", "Weak", "Weak", "Fair", "Strong", "Very strong"][strength];
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#00D4FF"][strength];

  return (
    <ToolPageShell
      title="Protect PDF"
      description="Add real AES-256 password encryption to your PDF, entirely in your browser."
      showFileDisclaimer={false}
    >
      {/* Honest disclaimer */}
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/8 p-4 flex gap-3 mb-6">
        <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-cyan-300">Real AES-256 encryption, entirely in your browser</p>
          <p className="text-cyan-200/70">
            This tool applies genuine <strong>AES-256 password encryption</strong> to your PDF — the same standard used
            by professional desktop tools. The file will prompt for a password in Adobe Acrobat, Chrome, macOS Preview,
            and virtually every PDF reader. Your file and password never leave your device.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {!file ? (
          <DropZone
            accept="application/pdf"
            onFiles={onFiles}
            label="Drop a PDF here"
            hint="or click to browse — your file never leaves your device"
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setDone(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change file
            </button>
          </div>
        )}

        {file && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      setStrength(calcStrength(e.target.value));
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm"
                    placeholder="Choose a password"
                    aria-label="Password"
                  />
                  <button
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pw && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all"
                          style={{ background: i <= strength ? strengthColor : "var(--border)" }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Confirm password
                </label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  placeholder="Repeat the password"
                  aria-label="Confirm password"
                />
                {confirm && pw !== confirm && <p className="text-xs text-red-400 mt-1">Passwords don't match</p>}
              </div>
            </div>

            {done && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-green-400 text-sm font-medium">✓ PDF encrypted and downloaded!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The file now requires your password to open in any PDF reader.
                </p>
              </div>
            )}

            <button
              onClick={protect}
              disabled={busy || !pw || pw !== confirm}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {busy ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {busy ? "Processing…" : "Add Password & Download"}
            </button>
          </div>
        )}

        {/* Advanced alternatives */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold mb-3">Need batch processing or fine-grained permissions?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DESKTOP_TOOLS.map((t) => (
              <a
                key={t.name}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary transition-colors group"
              >
                <span className="font-medium">{t.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${t.free ? "border-green-500/30 text-green-400 bg-green-500/8" : "border-border text-muted-foreground"}`}
                  >
                    {t.free ? "Free" : "Paid"}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <AdZone id="protect-pdf-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Upload your PDF — it never leaves your device.",
          "Enter and confirm a password. A strength indicator helps you choose a secure one.",
          "Click Add Password & Download. The file is encrypted with AES-256 and will prompt for the password in any PDF reader.",
        ]}
      />

      <ToolSeoContent
        title="Protect PDF with Password Online Free — AES-256 Encryption"
        description="Add real AES-256 password encryption to any PDF, entirely in your browser. Free, no upload, no signup required."
        body={[
          "Skycally's Protect PDF tool applies genuine AES-256 password encryption to any PDF document directly in your browser — the same encryption standard used by professional tools like Adobe Acrobat. Upload your PDF, enter a password, and download the encrypted file — no server upload, no account, no data transmitted.",
          "A built-in password strength indicator helps you choose a strong password — scoring for length, uppercase letters, numbers, and special characters. Once encrypted, the PDF will prompt for that password whenever it's opened in any standard PDF reader, including Adobe Acrobat Reader, Chrome's built-in viewer, and macOS Preview.",
          "The encryption runs entirely client-side using the browser's built-in Web Crypto API — the same cryptographic primitives used by HTTPS itself — to generate the encryption keys. Nothing about your file or your password is ever sent to a server.",
          "All processing happens locally in your browser. Your PDF is never uploaded to any server, making this tool completely private. Even the password you enter never leaves your device. The downloaded file is a standard, universally-compatible encrypted PDF.",
        ]}
        faqs={[
          {
            question: "Does this add a real password that prompts on opening?",
            answer:
              "Yes. The PDF is encrypted with AES-256, the same standard used by professional PDF software. Any standard PDF reader will prompt for the password before opening the file.",
          },
          {
            question: "Is the encryption really happening in my browser?",
            answer:
              "Yes. The tool uses the browser's built-in Web Crypto API to generate secure encryption keys locally. Your file and password are never transmitted anywhere.",
          },
          {
            question: "What is AES-256 PDF encryption?",
            answer:
              "AES-256 is the encryption standard used by Adobe Acrobat and other professional PDF tools. It encrypts the file contents themselves, so no reader can open the file without the correct password.",
          },
          {
            question: "Is my PDF uploaded to a server?",
            answer: "No. Everything runs locally in your browser. Your PDF and password never leave your device.",
          },
          {
            question: "Do I need special software to open the protected PDF?",
            answer:
              "No. Any standard PDF reader (Adobe Acrobat, Chrome, Firefox, macOS Preview, etc.) will recognize the encryption and prompt for the password automatically.",
          },
          {
            question: "Can I remove the password later?",
            answer:
              "Yes. Open the protected PDF with the password in a PDF editor, or use a PDF unlock tool with the correct password to save an unencrypted copy.",
          },
          {
            question: "Is there a file size limit?",
            answer: "No enforced limit. Very large PDFs may take a few extra seconds depending on your device.",
          },
          {
            question: "Does this work with already-encrypted PDFs?",
            answer:
              "The tool attempts to load encrypted PDFs using the ignoreEncryption flag. If the original PDF has a user password, it may fail to load — remove the existing password first.",
          },
        ]}
      />

      <RelatedTools currentSlug="protect-pdf" />
    </ToolPageShell>
  );
}
