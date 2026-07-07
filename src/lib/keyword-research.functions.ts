import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  keyword: z.string().trim().min(1).max(100),
  database: z.string().trim().min(2).max(4).default("us"),
});

export type KeywordResearchInput = z.infer<typeof InputSchema>;

export interface KeywordMetric {
  keyword: string;
  volume: number;
  cpc: number;
  competition: number;
  results: number;
  difficulty?: number;
}

export interface KeywordResearchResult {
  main: KeywordMetric | null;
  related: KeywordMetric[];
  questions: KeywordMetric[];
  database: string;
}

export const runKeywordResearch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<KeywordResearchResult> => {
    const { semrushFetch, num } = await import("./semrush.server");

    const commonCols = "Ph,Nq,Cp,Co,Nr,Td";
    const parseRow = (r: Record<string, string>): KeywordMetric => ({
      keyword: r.Ph ?? "",
      volume: num(r.Nq),
      cpc: num(r.Cp),
      competition: num(r.Co),
      results: num(r.Nr),
    });

    const [overview, related, questions] = await Promise.all([
      semrushFetch("keywords", "phrase_this", {
        phrase: data.keyword,
        database: data.database,
        export_columns: commonCols,
      }),
      semrushFetch("keywords", "phrase_related", {
        phrase: data.keyword,
        database: data.database,
        export_columns: commonCols,
        display_limit: 25,
      }),
      semrushFetch("keywords", "phrase_questions", {
        phrase: data.keyword,
        database: data.database,
        export_columns: commonCols,
        display_limit: 15,
      }),
    ]);

    return {
      main: overview.rows[0] ? parseRow(overview.rows[0]) : null,
      related: related.rows.map(parseRow),
      questions: questions.rows.map(parseRow),
      database: data.database,
    };
  });
