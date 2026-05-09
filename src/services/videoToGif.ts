export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function convertToGif(
  file: File,
  startTime: number,
  duration: number,
  width: number,
  fps: number,
  onProgress: (pct: number) => void,
  onStatus?: (msg: string) => void,
): Promise<Blob> {
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Max video size is 50MB");

  const { fetchFile } = await import("@ffmpeg/util");
  const { getFFmpeg } = await import("@/utils/ffmpegLoader");

  onStatus?.("Loading converter...");
  const ffmpeg = await getFFmpeg(onProgress);

  onStatus?.("Processing video...");
  await ffmpeg.writeFile("input", await fetchFile(file));

  onStatus?.("Generating GIF...");
  await ffmpeg.exec([
    "-ss", String(startTime),
    "-t", String(duration),
    "-i", "input",
    "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    "-loop", "0",
    "output.gif",
  ]);

  const data = (await ffmpeg.readFile("output.gif")) as Uint8Array;
  const buf = new Uint8Array(data);
  return new Blob([buf.buffer as ArrayBuffer], { type: "image/gif" });
}
