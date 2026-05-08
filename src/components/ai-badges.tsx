import { Cpu, ShieldCheck, Loader2, CameraOff } from "lucide-react";

export function PoweredBy({ name }: { name: string }) {
  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Cpu className="w-3.5 h-3.5" style={{ color: "var(--violet-brand)" }} />
      Powered by {name}
    </div>
  );
}

export function BrowserOnlyBadge() {
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground ml-2">
      <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--green-brand)" }} />
      Works entirely in your browser — your data never leaves your device
    </div>
  );
}

export function ModelLoadingSkeleton({ label = "Loading AI model..." }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--violet-brand)" }} />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Loaded once, then cached by your browser.</p>
    </div>
  );
}

export function CameraPermissionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <CameraOff className="w-8 h-8 mx-auto mb-3 text-destructive" />
      <p className="font-semibold mb-1">Camera access denied</p>
      <p className="text-sm text-muted-foreground mb-4">
        Please allow camera access in your browser settings, then try again.
      </p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2">
          Retry
        </button>
      )}
    </div>
  );
}
