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

const API_URL =
  import.meta.env.VITE_API_URL || "https://skycally-api-production.up.railway.app";

export async function fetchVideo(input: { url: string }): Promise<VideoResult> {
  const res = await fetch(
    `${API_URL}/api/video-info?url=${encodeURIComponent(input.url)}`,
  );
  if (!res.ok) {
    let detail = "API_REQUEST_FAILED";
    try {
      const j = await res.json();
      if (j?.detail) detail = String(j.detail);
    } catch {}
    throw new Error(detail);
  }
  return (await res.json()) as VideoResult;
}
