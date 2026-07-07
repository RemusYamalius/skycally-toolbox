import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  target: z.string().trim().min(3).max(255),
  targetType: z.enum(["root_domain", "domain", "url"]).default("root_domain"),
});

export type BacklinkCheckerInput = z.infer<typeof InputSchema>;

export interface ReferringDomain {
  domain: string;
  authorityScore: number;
  backlinks: number;
  country: string;
}

export interface BacklinkCheckerResult {
  target: string;
  authorityScore: number;
  totalBacklinks: number;
  referringDomains: number;
  referringIps: number;
  follows: number;
  nofollows: number;
  texts: number;
  images: number;
  topReferrers: ReferringDomain[];
}

export const runBacklinkChecker = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<BacklinkCheckerResult> => {
    const { semrushFetch, num, normaliseDomain, normaliseUrl } = await import("./semrush.server");
    const target = data.targetType === "url" ? normaliseUrl(data.target) : normaliseDomain(data.target);

    const [overview, refDomains] = await Promise.all([
      semrushFetch("backlinks", "backlinks_overview", {
        target,
        target_type: data.targetType,
      }),
      semrushFetch("backlinks", "backlinks_refdomains", {
        target,
        target_type: data.targetType,
        display_limit: 25,
      }),
    ]);

    const o = overview.rows[0] ?? {};
    return {
      target,
      authorityScore: num(o.ascore ?? o.score),
      totalBacklinks: num(o.total),
      referringDomains: num(o.domains_num),
      referringIps: num(o.ips_num),
      follows: num(o.follows_num),
      nofollows: num(o.nofollows_num),
      texts: num(o.texts_num),
      images: num(o.images_num),
      topReferrers: refDomains.rows.map((r) => ({
        domain: r.domain ?? "",
        authorityScore: num(r.domain_ascore ?? r.ascore),
        backlinks: num(r.backlinks_num),
        country: r.country ?? "",
      })),
    };
  });
