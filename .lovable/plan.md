# Add Flappy Bird to Mini Games

## Step 1 — Update `src/lib/tools.ts`
- Add `Bird` to the `lucide-react` import line.
- Append after `typing-speed`:
  ```ts
  { slug: "flappy-bird", name: "Flappy Bird", description: "Tap to flap and fly through the pipes! How far can you go?", category: "minigames", icon: Bird, path: "/tools/flappy-bird" },
  ```

## Step 2 — Create `src/routes/tools.flappy-bird.tsx`
Mirror the structure of `src/routes/tools.typing-speed.tsx` (route export, `buildToolMeta` head, `ToolPageShell` + `HowToUse` + `RelatedTools` + `ToolSeoContent`).

Canvas-based game (no external libs) per spec:
- **Constants**: W=400, H=600, GRAVITY=0.5, FLAP_FORCE=-9, PIPE_WIDTH=60, PIPE_GAP=160, PIPE_SPEED=2.5, PIPE_INTERVAL=1600, BIRD_X=80, BIRD_SIZE=28.
- **State**: `phase` (`idle` | `playing` | `dead`), `score`, `best` (persisted to `localStorage["flappy-best"]`).
- **Refs**: `canvasRef`, `birdRef` ({ y, vy }), `pipesRef` (Pipe[]), `scoreRef`, `phaseRef`, `animRef`, `lastPipeRef`. Refs are the single source of truth during the loop; React state is UI-only.
- **Loop**: spawn pipes every PIPE_INTERVAL ms, apply gravity, move pipes, score when pipe passes bird, collide vs ceiling/floor/pipes (with 4px tolerance), draw each frame via `requestAnimationFrame`. On hit → `phase=dead`, update best.
- **Draw**: sky/ground/grass, green pipes with caps, rotated yellow bird (body, wing, eye, beak) with angle based on vy, score badge centered top.
- **Overlay**: idle screen ("Tap / Press Space to Start"), dead screen (score, best, restart prompt).
- **Input**: click + touchstart on canvas, Space key globally → `flap()` (jumps to FLAP_FORCE while playing, otherwise starts a new game).
- **Lifecycle**: draw idle overlay on mount; draw dead overlay when phase becomes dead; cancel animation frame on unmount.
- **JSX**: best score above canvas (when >0), `<canvas width={W} height={H}>` with rounded border, hint text below.
- **HowToUse**: 3 steps as specified.
- **ToolSeoContent**: title, description, 2 paragraphs, 4 FAQs (controls, scoring, keyboard, mobile touch).

English only. Semantic tokens (`border-border`, `text-muted-foreground`) for shell; raw colors are fine inside canvas drawing calls. Route file is auto-registered — do not edit `routeTree.gen.ts`.

## Files
- edit: `src/lib/tools.ts`
- create: `src/routes/tools.flappy-bird.tsx`
