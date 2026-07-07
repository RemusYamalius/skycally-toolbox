import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  domain: z.string().trim().min(3).max(255),
  database: z.string().trim().min(2).max(4).default("us"),
});

export type CompetitorAnalysisInput = z.infer<typeof InputSchema>;

export interface Competitor {
  domain: string;
  competitionLevel: number;
  commonKeywords: number;
  organicKeywords: number;
  organicTraffic: number;
}

export interface CompetitorAnalysisResult {
  domain: string;
  database: string;
  competitors: Competitor[];
}

export const runCompetitorAnalysis = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<CompetitorAnalysisResult> => {
    const { semrushFetch, num, normaliseDomain } = await import("./semrush.server");
    const domain = normaliseDomain(data.domain);

    const result = await semrushFetch("domains", "domain_organic_organic", {
      domain,
      database: data.database,
      export_columns: "Dn,Cr,Np,Or,Ot",
      display_limit: 25,
    });

    return {
      domain,
      database: data.database,
      competitors: result.rows.map((r) => ({
        domain: r.Dn ?? "",
        competitionLevel: num(r.Cr),
        commonKeywords: num(r.Np),
        organicKeywords: num(r.Or),
        organicTraffic: num(r.Ot),
      })),
    };
  });
