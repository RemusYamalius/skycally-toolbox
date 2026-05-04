// Video downloader API service.
// Swap the mock with a real call to /api/download?url= when backend is ready.

export interface VideoFormat {
  quality: string;
  ext: string;
  size: string;
}

export interface VideoResult {
  title: string;
  thumbnail: string;
  formats: VideoFormat[];
}

export async function fetchVideo(url: string): Promise<VideoResult> {
  // Real implementation (uncomment when backend ready):
  // const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
  // if (!res.ok) throw new Error("Failed to fetch video");
  // return res.json();

  if (!url || !/^https?:\/\//.test(url)) {
    throw new Error("Please paste a valid video URL.");
  }

  await new Promise((r) => setTimeout(r, 1500));
  return {
    title: "Amazing Video Title",
    thumbnail: "https://picsum.photos/seed/skycally/640/360",
    formats: [
      { quality: "1080p HD", ext: "mp4", size: "45 MB" },
      { quality: "720p", ext: "mp4", size: "22 MB" },
      { quality: "480p", ext: "mp4", size: "12 MB" },
      { quality: "MP3 Audio", ext: "mp3", size: "4 MB" },
    ],
  };
}
