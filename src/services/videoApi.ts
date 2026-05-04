// Re-export server-fn typed result so existing imports keep working
export type { VideoResult, VideoFormat } from "@/server/video.functions";
export { getVideo as fetchVideo } from "@/server/video.functions";
