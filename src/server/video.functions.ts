import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ url: z.string().url() });

export interface VideoFormat {
  quality: string;
  url: string;
  ext: string;
  size?: string;
}
export interface VideoResult {
  title: string;
  thumbnail: string;
  formats: VideoFormat[];
}

export const getVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<VideoResult> => {
    const { enforceRateLimit } = await import("./rate-limit.server");
    enforceRateLimit("video", 10);

    const key = process.env.RAPIDAPI_KEY;
    if (!key) throw new Error("Service not configured");
    const endpoint = `https://social-media-video-downloader.p.rapidapi.com/smvd/get/all?url=${encodeURIComponent(data.url)}`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
        },
      });
    } catch {
      throw new Error("API_REQUEST_FAILED");
    }
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (!res.ok) throw new Error("API_REQUEST_FAILED");

    let json: any;
    try { json = await res.json(); } catch { throw new Error("API_REQUEST_FAILED"); }

    if (json?.success === false) throw new Error("VIDEO_NOT_FOUND");

    const links: any[] = Array.isArray(json?.links) ? json.links : [];
    const formats = links
      .map((l) => ({
        quality: l.quality || l.render_quality || l.resolution || l.type || "Default",
        url: l.link || l.url,
        ext: String(l.type || "mp4").toLowerCase(),
        size: l.size || undefined,
      }))
      .filter((f) => f.url);

    if (!formats.length) throw new Error("VIDEO_NOT_FOUND");

    return {
      title: json.title || "Video",
      thumbnail: json.picture || json.thumbnail || "",
      formats,
    };
  });
