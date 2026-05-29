type SoundType =
  | "flap" | "score" | "hit" | "die"
  | "move" | "capture" | "check" | "castle" | "win" | "lose"
  | "correct" | "wrong" | "finish"
  | "found" | "allFound"
  | "place" | "clear" | "tetrisDrop"
  | "flip" | "match" | "noMatch"
  | "click" | "success" | "fail"
  | "tick";

let _ctx: AudioContext | null = null;
const getCtx = (): AudioContext => {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
};

interface SoundConfig {
  freq: number;
  type: OscillatorType;
  duration: number;
  gain: number;
  freqEnd?: number;
}

const SOUNDS: Record<SoundType, SoundConfig> = {
  flap:      { freq: 440,  type: "sine",     duration: 0.08, gain: 0.15 },
  score:     { freq: 880,  type: "sine",     duration: 0.15, gain: 0.2, freqEnd: 1100 },
  hit:       { freq: 180,  type: "sawtooth", duration: 0.25, gain: 0.35, freqEnd: 80 },
  die:       { freq: 120,  type: "sawtooth", duration: 0.5,  gain: 0.3,  freqEnd: 40 },
  move:      { freq: 600,  type: "sine",     duration: 0.06, gain: 0.12 },
  capture:   { freq: 320,  type: "square",   duration: 0.14, gain: 0.22, freqEnd: 180 },
  check:     { freq: 740,  type: "square",   duration: 0.2,  gain: 0.28, freqEnd: 900 },
  castle:    { freq: 520,  type: "sine",     duration: 0.18, gain: 0.18, freqEnd: 680 },
  win:       { freq: 660,  type: "sine",     duration: 0.6,  gain: 0.25, freqEnd: 880 },
  lose:      { freq: 220,  type: "sawtooth", duration: 0.6,  gain: 0.25, freqEnd: 110 },
  correct:   { freq: 700,  type: "sine",     duration: 0.07, gain: 0.1  },
  wrong:     { freq: 220,  type: "sawtooth", duration: 0.1,  gain: 0.18 },
  finish:    { freq: 880,  type: "sine",     duration: 0.4,  gain: 0.2,  freqEnd: 1100 },
  found:     { freq: 600,  type: "sine",     duration: 0.2,  gain: 0.2,  freqEnd: 800 },
  allFound:  { freq: 880,  type: "sine",     duration: 0.5,  gain: 0.25, freqEnd: 1200 },
  place:     { freq: 300,  type: "sine",     duration: 0.1,  gain: 0.15 },
  clear:     { freq: 500,  type: "sine",     duration: 0.3,  gain: 0.25, freqEnd: 800 },
  tetrisDrop:{ freq: 200,  type: "sine",     duration: 0.05, gain: 0.12 },
  flip:      { freq: 480,  type: "sine",     duration: 0.07, gain: 0.1  },
  match:     { freq: 700,  type: "sine",     duration: 0.25, gain: 0.2,  freqEnd: 900 },
  noMatch:   { freq: 250,  type: "sawtooth", duration: 0.2,  gain: 0.15 },
  click:     { freq: 500,  type: "sine",     duration: 0.05, gain: 0.08 },
  success:   { freq: 660,  type: "sine",     duration: 0.4,  gain: 0.2,  freqEnd: 880 },
  fail:      { freq: 200,  type: "sawtooth", duration: 0.4,  gain: 0.2,  freqEnd: 100 },
  tick:      { freq: 1000, type: "square",   duration: 0.04, gain: 0.08 },
};

export const playSound = (type: SoundType): void => {
  try {
    if (typeof window === "undefined") return;
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const cfg = SOUNDS[type];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.type = cfg.type;
    o.frequency.setValueAtTime(cfg.freq, now);
    if (cfg.freqEnd !== undefined) {
      o.frequency.exponentialRampToValueAtTime(cfg.freqEnd, now + cfg.duration);
    }
    g.gain.setValueAtTime(cfg.gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);
    o.start(now);
    o.stop(now + cfg.duration);
  } catch (_) { /* silent */ }
};

export const playChord = (types: SoundType[]): void => {
  types.forEach((t, i) => setTimeout(() => playSound(t), i * 80));
};
