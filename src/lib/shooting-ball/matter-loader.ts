import { loadScript } from "@/lib/cdnScript";

const MATTER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js";

// Minimal typed shim for the parts of Matter.js we use.
export interface MatterVec { x: number; y: number }
export interface MatterBody {
  id: number;
  label: string;
  position: MatterVec;
  velocity: MatterVec;
  angle: number;
  circleRadius?: number;
  isStatic: boolean;
  isSensor: boolean;
  render?: { fillStyle?: string; strokeStyle?: string; lineWidth?: number };
  plugin?: Record<string, unknown>;
}
export interface MatterEngine {
  world: MatterWorld;
  gravity: MatterVec & { scale: number };
}
export interface MatterWorld {
  bodies: MatterBody[];
}
export interface MatterEventPair { bodyA: MatterBody; bodyB: MatterBody }
export interface MatterEventCollision { pairs: MatterEventPair[] }
export interface MatterGlobal {
  Engine: {
    create(opts?: Record<string, unknown>): MatterEngine;
    update(engine: MatterEngine, delta: number): void;
    clear(engine: MatterEngine): void;
  };
  World: {
    add(world: MatterWorld, body: MatterBody | MatterBody[]): void;
    remove(world: MatterWorld, body: MatterBody | MatterBody[]): void;
    clear(world: MatterWorld, keepStatic?: boolean): void;
  };
  Bodies: {
    circle(x: number, y: number, r: number, opts?: Record<string, unknown>): MatterBody;
    rectangle(x: number, y: number, w: number, h: number, opts?: Record<string, unknown>): MatterBody;
  };
  Body: {
    applyForce(body: MatterBody, position: MatterVec, force: MatterVec): void;
    setVelocity(body: MatterBody, v: MatterVec): void;
    setPosition(body: MatterBody, v: MatterVec): void;
    setStatic(body: MatterBody, s: boolean): void;
  };
  Events: {
    on(engine: MatterEngine, event: "collisionStart", cb: (e: MatterEventCollision) => void): void;
    off(engine: MatterEngine, event: string, cb: (e: MatterEventCollision) => void): void;
  };
}

declare global {
  interface Window {
    Matter?: MatterGlobal;
  }
}

export async function loadMatterJs(): Promise<MatterGlobal> {
  if (typeof window !== "undefined" && window.Matter) return window.Matter;
  await loadScript(MATTER_CDN);
  if (!window.Matter) throw new Error("Matter.js failed to load");
  return window.Matter;
}
