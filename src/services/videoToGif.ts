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

  onStatus?.("Loading converter...");
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpeg.on("progress", ({ progress }) => onProgress(Math.min(100, Math.round(progress * 100))));

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
