import type { Difficulty } from "./pieces";
import musicExpert from "@/assets/music-expert.mp3.asset.json";

export interface MusicTrack {
  src: string;
  title: string;
  artist: string;
}

// Self-hosted (not hotlinked) — same reasoning as the preset images: no
// external-domain dependency, no CORS risk. Sourced from the YouTube Audio
// Library, "Attribution not required" filter, so no on-page credit is
// legally necessary — the fields below are kept purely for our own records.
export const MUSIC_TRACKS: Record<Difficulty, MusicTrack> = {
  easy: {
    src: "/jigsaw-puzzle/music-easy.mp3",
    title: "Goofy Gubbins",
    artist: "Joel Cummins",
  },
  medium: {
    src: "/jigsaw-puzzle/music-medium.mp3",
    title: "Leafing Through the Days",
    artist: "Nathan Moore",
  },
  hard: {
    src: "/jigsaw-puzzle/music-hard.mp3",
    title: "Little Samba",
    artist: "Quincas Moreira",
  },
  expert: {
    // Served from Lovable's CDN: the original file exceeds the repo's
    // 10 MB per-file limit, so it is stored as an asset instead.
    src: musicExpert.url,
    title: "No Clarity",
    artist: "Stayloose",
  },
};
