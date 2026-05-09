import { useEffect, useState } from "react";

export function FFmpegBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem("ffmpeg-warmed"));
    } catch {}
  }, []);
  if (!show) return null;
  return (
    <div className="mb-6 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
      <span>⚡</span>
      <span>First use downloads FFmpeg (~30 MB). Subsequent runs are instant.</span>
    </div>
  );
}

export function PoweredByNote() {
  return (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      Powered by FFmpeg WebAssembly · runs entirely in your browser
    </p>
  );
}
