import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  domain: z.string().trim().min(3).max(255),
  database: z.string().trim().min(2).max(4).default("us"),
});

export type DomainAnalysisInput = z.infer<typeof InputSchema>;

export interface DomainKeyword {
  keyword: string;
  position: number;
  volume: number;
  cpc: number;
  traffic: number;
  url: string;
}

export interface DomainAnalysisResult {
  domain: string;
  database: string;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  adwordsKeywords: number;
  adwordsTraffic: number;
  topKeywords: DomainKeyword[];
}

export const runDomainAnalysis = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<DomainAnalysisResult> => {
    const { semrushFetch, num, normaliseDomain } = await import("./semrush.server");
    const domain = normaliseDomain(data.domain);

    const [overview, keywords] = await Promise.all([
      semrushFetch("domains", "domain_ranks", {
        domain,
        database: data.database,
        export_columns: "Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac",
      }),
      semrushFetch("domains", "domain_organic", {
        domain,
        database: data.database,
        export_columns: "Ph,Po,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td",
        display_limit: 25,
      }),
    ]);

    const o = overview.rows[0] ?? {};
    return {
      domain,
      database: data.database,
      organicKeywords: num(o.Or),
      organicTraffic: num(o.Ot),
      organicCost: num(o.Oc),
      adwordsKeywords: num(o.Ad),
      adwordsTraffic: num(o.At),
      topKeywords: keywords.rows.map((r) => ({
        keyword: r.Ph ?? "",
        position: num(r.Po),
        volume: num(r.Nq),
        cpc: num(r.Cp),
        traffic: num(r.Tr),
        url: r.Ur ?? "",
      })),
    };
  });
