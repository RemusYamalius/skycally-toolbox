import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({ url: z.string().url() });

export interface VideoFormat {
  quality: string;
  url: string;
  ext: string;
}
export interface VideoResult {
  title: string;
  thumbnail: string;
  formats: VideoFormat[];
}

export const getVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<VideoResult> => {
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
      throw new Error("Connection error. Please try again.");
    }
    if (res.status === 429) throw new Error("Rate limit reached. Try again in a minute.");
    if (!res.ok) throw new Error("This video may be private or unsupported");
    const json: any = await res.json();
    const links: any[] = Array.isArray(json?.links) ? json.links : [];
    if (!links.length) throw new Error("No downloadable formats found for this video");
    return {
      title: json.title || "Video",
      thumbnail: json.picture || json.thumbnail || "",
      formats: links.map((l) => ({
        quality: l.quality || l.resolution || l.type || "Default",
        url: l.link || l.url,
        ext: (l.type || "mp4").toLowerCase(),
      })).filter((f) => f.url),
    };
  });
