import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { DropZone } from "@/components/drop-zone";
import { HowToUse } from "@/components/how-to-use";
import { removeBackground } from "@/services/removeBg";
import { downloadBlob, checkSize } from "@/lib/file-utils";

export const Route = createFileRoute("/tools/remove-bg")({
  head: () => buildToolMeta(toolBySlug("remove-bg", tools)),} alt="" className="rounded-xl border border-border w-full" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">RESULT</p>
              <div className="rounded-xl border border-border w-full aspect-square flex items-center justify-center text-sm text-muted-foreground" style={{ backgroundImage: "linear-gradient(45deg, var(--secondary) 25%, transparent 25%), linear-gradient(-45deg, var(--secondary) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--secondary) 75%), linear-gradient(-45deg, transparent 75%, var(--secondary) 75%)", backgroundSize: "20px 20px", backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0" }}>
                {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Removing background...</span>
                  : resultUrl ? <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                  : "Awaiting result..."}
              </div>
            </div>
          </div>
          {!resultUrl ? (
            <button onClick={run} disabled={busy} className="w-full rounded-xl bg-foreground text-background font-semibold py-3 disabled:opacity-50">{busy ? "Removing..." : "Remove background"}</button>
          ) : (
            <button onClick={() => downloadBlob(resultBlob!, file.name.replace(/\.[^.]+$/, "") + "-nobg.png")} className="w-full rounded-xl bg-foreground text-background font-semibold py-3">Download PNG</button>
          )}
          <button onClick={reset} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">Use a different image</button>
        </div>
      )}

      <HowToUse steps={[
        "Drop a photo of a person, product or object.",
        "Click Remove background and wait a few seconds.",
        "Download the transparent PNG, ready to use anywhere.",
      ]} />
    </ToolPageShell>
  );
}
