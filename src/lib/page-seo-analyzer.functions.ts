import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  url: z.string().trim().min(5).max(500),
  database: z.string().trim().min(2).max(4).default("us"),
});

export type PageSeoAnalyzerInput = z.infer<typeof InputSchema>;

export interface PageKeyword {
  keyword: string;
  position: number;
  volume: number;
  cpc: number;
  traffic: number;
}

export interface PageSeoAnalyzerResult {
  url: string;
  database: string;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  keywords: PageKeyword[];
}

export const runPageSeoAnalyzer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<PageSeoAnalyzerResult> => {
    const { semrushFetch, num, normaliseUrl } = await import("./semrush.server");
    const url = normaliseUrl(data.url);

    const [ranks, keywords] = await Promise.all([
      semrushFetch("url", "url_ranks", {
        url,
        database: data.database,
        export_columns: "Rk,Or,Ot,Oc,Ad,At,Ac",
      }),
      semrushFetch("url", "url_organic", {
        url,
        database: data.database,
        export_columns: "Ph,Po,Nq,Cp,Tr,Tc,Co",
        display_limit: 25,
      }),
    ]);

    const r = ranks.rows[0] ?? {};
    return {
      url,
      database: data.database,
      organicKeywords: num(r.Or),
      organicTraffic: num(r.Ot),
      organicCost: num(r.Oc),
      keywords: keywords.rows.map((k) => ({
        keyword: k.Ph ?? "",
        position: num(k.Po),
        volume: num(k.Nq),
        cpc: num(k.Cp),
        traffic: num(k.Tr),
      })),
    };
  });
