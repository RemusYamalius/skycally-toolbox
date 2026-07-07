import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  keywords: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .transform((s) =>
      s
        .split(/[\n,;]+/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  database: z.string().trim().min(2).max(4).default("us"),
});

export type KeywordDifficultyInput = z.infer<typeof InputSchema>;

export interface KdiEntry {
  keyword: string;
  difficulty: number;
  volume: number;
  cpc: number;
  competition: number;
}

export interface KeywordDifficultyResult {
  database: string;
  entries: KdiEntry[];
}

export const runKeywordDifficulty = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<KeywordDifficultyResult> => {
    const { semrushFetch, num } = await import("./semrush.server");
    if (data.keywords.length === 0) return { database: data.database, entries: [] };

    const phrase = data.keywords.join(";");

    const [kdi, overview] = await Promise.all([
      semrushFetch("keywords", "phrase_kdi", {
        phrase,
        database: data.database,
        export_columns: "Ph,Kd",
      }),
      semrushFetch("keywords", "phrase_these", {
        phrase,
        database: data.database,
        export_columns: "Ph,Nq,Cp,Co",
      }),
    ]);

    const kdiMap = new Map<string, number>();
    for (const r of kdi.rows) kdiMap.set((r.Ph ?? "").toLowerCase(), num(r.Kd));

    const overviewMap = new Map<string, { volume: number; cpc: number; competition: number }>();
    for (const r of overview.rows) {
      overviewMap.set((r.Ph ?? "").toLowerCase(), {
        volume: num(r.Nq),
        cpc: num(r.Cp),
        competition: num(r.Co),
      });
    }

    return {
      database: data.database,
      entries: data.keywords.map((k) => {
        const key = k.toLowerCase();
        const ov = overviewMap.get(key) ?? { volume: 0, cpc: 0, competition: 0 };
        return {
          keyword: k,
          difficulty: kdiMap.get(key) ?? 0,
          volume: ov.volume,
          cpc: ov.cpc,
          competition: ov.competition,
        };
      }),
    };
  });
