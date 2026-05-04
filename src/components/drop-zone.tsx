import { useCallback, useState, useRef } from "react";
import { Upload } from "lucide-react";

interface Props {
  multiple?: boolean;
  accept?: string;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
}

export function DropZone({ multiple, accept, onFiles, label = "Drop files here", hint = "or click to browse" }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    onFiles(Array.from(files));
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition p-12 text-center ${over ? "border-[var(--cyan-brand)] bg-[color-mix(in_oklab,var(--cyan-brand)_8%,transparent)]" : "border-border bg-card hover:border-foreground/30"}`}
    >
      <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
      <p className="font-display font-semibold text-lg">{label}</p>
      <p className="text-sm text-muted-foreground mt-1">{hint}</p>
      <input ref={inputRef} type="file" multiple={multiple} accept={accept} className="hidden" onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};
