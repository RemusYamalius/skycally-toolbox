import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, RotateCw, Copy, RefreshCw, Zap, Pencil, Check } from "lucide-react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/random-team-maker")({
  head: () => buildToolMeta(toolBySlug("random-team-maker", tools)),
  component: RandomTeamMaker,
});

const PALETTE = ["#a855f7", "#06b6d4", "#f97316", "#22c55e", "#ec4899", "#eab308", "#3b82f6", "#ef4444"];

type Phase = "setup" | "spin" | "done";
type Segment = { label: string; color: string };

const DEFAULT_PLAYERS = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "George", "Hannah"];
const TEAM_OPTIONS = [2, 3, 4, 5] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distribute(players: string[], k: number, balanced: boolean): string[][] {
  const out: string[][] = Array.from({ length: k }, () => []);
  const shuffled = shuffle(players);
  if (balanced) {
    shuffled.forEach((p, i) => out[i % k].push(p));
  } else {
    shuffled.forEach((p) => out[Math.floor(Math.random() * k)].push(p));
  }
  return out;
}

function Wheel({ segments, rotation }: { segments: Segment[]; rotation: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(420);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSize(Math.min(420, Math.floor(w) - 2));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 8;
    const n = Math.max(segments.length, 1);
    const seg = (Math.PI * 2) / n;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    for (let i = 0; i < n; i++) {
      const start = i * seg - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = segments[i]?.color ?? PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#0b0b0f";
      ctx.font = "bold 16px ui-sans-serif, system-ui, sans-serif";
      const label = segments[i]?.label ?? "";
      const max = r - 20;
      let txt = label;
      while (ctx.measureText(txt).width > max && txt.length > 3) txt = txt.slice(0, -1);
      if (txt !== label) txt = txt.slice(0, -1) + "…";
      ctx.fillText(txt, r - 14, 6);
      ctx.restore();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0b0f";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [segments, rotation, size]);

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full">
      <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
        <canvas ref={canvasRef} style={{ width: size, height: size }} className="rounded-full shadow-2xl" />
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-[var(--cyan-brand)] drop-shadow" />
      </div>
    </div>
  );
}

function defaultTeamNames(k: number): string[] {
  return Array.from({ length: k }, (_, i) => `Team ${i + 1}`);
}

function RandomTeamMaker() {
  const tool = toolBySlug("random-team-maker", tools);

  const [phase, setPhase] = useState<Phase>("setup");
  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);
  const [playerInput, setPlayerInput] = useState("");
  const [teamCount, setTeamCount] = useState<number>(2);
  const [balanced, setBalanced] = useState(true);
  const [teamNames, setTeamNames] = useState<string[]>(defaultTeamNames(2));
  const [editingTeamIdx, setEditingTeamIdx] = useState<number | null>(null);

  const [assignments, setAssignments] = useState<string[][]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [nextTeamIdx, setNextTeamIdx] = useState(0);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  // resync team names when teamCount changes
  useEffect(() => {
    setTeamNames((prev) => {
      if (prev.length === teamCount) return prev;
      if (prev.length < teamCount) {
        return [...prev, ...defaultTeamNames(teamCount).slice(prev.length)];
      }
      return prev.slice(0, teamCount);
    });
  }, [teamCount]);

  // Auto-detects the separator: newlines, commas, or semicolons. Pasting
  // "Ana, Ben; Cara" or a multi-line list adds each name individually.
  // Duplicate names are intentionally kept — two people can share a name.
  const addPlayer = () => {
    const names = playerInput
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setPlayers((p) => [...p, ...names]);
    setPlayerInput("");
  };

  const removePlayer = (i: number) => setPlayers((p) => p.filter((_, idx) => idx !== i));

  const segments: Segment[] = useMemo(
    () => queue.map((p, i) => ({ label: p, color: PALETTE[i % PALETTE.length] })),
    [queue],
  );

  const canStart = players.length >= 2 && teamCount <= players.length;

  const startSpin = () => {
    setAssignments(Array.from({ length: teamCount }, () => []));
    setQueue(shuffle(players));
    setNextTeamIdx(0);
    setRotation(0);
    setPhase("spin");
  };

  const startOver = () => {
    setPhase("setup");
    setAssignments([]);
    setQueue([]);
    setNextTeamIdx(0);
    setRotation(0);
  };

  const shuffleAgain = () => {
    setAssignments(distribute(players, teamCount, balanced));
  };

  const finishWithRandomAssignment = (
    remainingQueue: string[],
    startingTeam: number,
    currentAssignments: string[][],
  ) => {
    const out = currentAssignments.map((t) => [...t]);
    let t = startingTeam;
    remainingQueue.forEach((p) => {
      if (balanced) {
        out[t].push(p);
        t = (t + 1) % teamCount;
      } else {
        out[Math.floor(Math.random() * teamCount)].push(p);
      }
    });
    setAssignments(out);
    setQueue([]);
    setPhase("done");
  };

  const skipAnimation = () => {
    finishWithRandomAssignment(queue, nextTeamIdx, assignments);
  };

  const spin = () => {
    if (spinning || queue.length === 0) return;
    setSpinning(true);
    const n = queue.length;
    const target = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const targetCenterDeg = target * seg + seg / 2;
    const turns = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + turns * 360 + (360 - targetCenterDeg) - (rotation % 360);
    const start = performance.now();
    const duration = 3200;
    const from = rotation;
    const delta = finalRotation - from;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setRotation(from + delta * eased);
      if (p < 1) requestAnimationFrame(tick);
      else {
        setSpinning(false);
        const picked = queue[target];
        const newQueue = queue.filter((_, i) => i !== target);
        const newAssignments = assignments.map((team, i) => (i === nextTeamIdx ? [...team, picked] : team));
        setAssignments(newAssignments);
        setQueue(newQueue);
        if (newQueue.length === 0) {
          setPhase("done");
        } else {
          const advanceTeam = balanced ? (nextTeamIdx + 1) % teamCount : Math.floor(Math.random() * teamCount);
          setNextTeamIdx(advanceTeam);
        }
      }
    };
    requestAnimationFrame(tick);
  };

  const copyResults = async () => {
    const text = assignments.map((team, i) => `${teamNames[i]}:\n${team.map((p) => `  ${p}`).join("\n")}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Results copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const perTeam = teamCount > 0 ? Math.floor(players.length / teamCount) : 0;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {phase === "setup" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Players */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Players ({players.length})</h2>
            </div>
            <div className="flex gap-2 mb-3">
              <Input
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlayer())}
                placeholder="Add player name"
              />
              <Button onClick={addPlayer} variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="flex-1 truncate">{p}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlayer(i)}
                    disabled={players.length <= 2}
                    aria-label="Remove player"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Teams */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Teams</h2>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Number of teams</p>
              <div className="flex gap-2">
                {TEAM_OPTIONS.map((n) => (
                  <Button
                    key={n}
                    variant={teamCount === n ? "default" : "outline"}
                    onClick={() => setTeamCount(n)}
                    className="w-12"
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">~{perTeam} players per team</p>
            </div>

            <div className="flex items-center justify-between mb-4 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Balanced teams</p>
                <p className="text-xs text-muted-foreground">Distribute players as evenly as possible</p>
              </div>
              <Switch checked={balanced} onCheckedChange={setBalanced} />
            </div>

            <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
              {teamNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  {editingTeamIdx === i ? (
                    <>
                      <Input
                        autoFocus
                        value={name}
                        onChange={(e) => setTeamNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setEditingTeamIdx(null);
                          }
                        }}
                        onBlur={() => setEditingTeamIdx(null)}
                        className="h-7"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTeamIdx(null)}
                        aria-label="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{name}</span>
                      <Button variant="ghost" size="icon" onClick={() => setEditingTeamIdx(i)} aria-label="Rename team">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col items-center gap-3">
            {!canStart && (
              <p className="text-sm text-red-500 text-center">
                ⚠️ You need at least 2 players and at least as many players as teams
              </p>
            )}
            <Button onClick={startSpin} disabled={!canStart} size="lg" className="px-10">
              Make Teams!
            </Button>
          </div>
        </div>
      )}

      {phase === "spin" && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Assigning to</p>
            <p className="font-display text-2xl font-bold inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: PALETTE[nextTeamIdx % PALETTE.length] }} />
              {teamNames[nextTeamIdx]}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ({assignments[nextTeamIdx]?.length ?? 0}/{players.length} players assigned overall:{" "}
              {players.length - queue.length}/{players.length})
            </p>
          </div>
          <Wheel segments={segments} rotation={rotation} />
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={spin} disabled={spinning} size="lg" className="px-10">
              <RotateCw className={`w-4 h-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
              {spinning ? "Spinning…" : "Spin"}
            </Button>
            <Button onClick={skipAnimation} variant="outline" disabled={spinning}>
              <Zap className="w-4 h-4 mr-2" />
              Skip animation — assign all randomly
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((team, i) => {
              const color = PALETTE[i % PALETTE.length];
              return (
                <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div
                    className="px-4 py-3 flex items-center gap-2 font-display font-bold text-white"
                    style={{ background: color }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
                    {teamNames[i]}
                    <span className="ml-auto text-sm font-medium opacity-90">{team.length}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {team.map((p, j) => (
                      <li key={j} className="px-4 py-2 text-sm">
                        {p}
                      </li>
                    ))}
                    {team.length === 0 && (
                      <li className="px-4 py-2 text-sm text-muted-foreground italic">No players</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={shuffleAgain}>
              <RefreshCw className="w-4 h-4 mr-2" /> Shuffle Again
            </Button>
            <Button variant="outline" onClick={startOver}>
              Start Over
            </Button>
            <Button onClick={copyResults}>
              <Copy className="w-4 h-4 mr-2" /> Copy Results
            </Button>
          </div>
        </div>
      )}

      <AdZone id="random-team-maker-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Enter all player names and choose how many teams you need.",
          "Hit Make Teams and watch the wheel assign each player randomly.",
          "Share the results or shuffle again for a different split.",
        ]}
      />

      <ToolSeoContent
        title="Free Random Team Maker — Split People into Balanced Teams"
        description="Randomly split any group of people into balanced teams. Enter names, choose team count, and spin. Free, browser-based team randomizer. No signup required."
        body={[
          "Skycally's Random Team Maker takes the awkwardness out of picking teams by hand. Type in everyone's name, choose how many teams you need, and let the wheel hand out players one spin at a time. The balanced mode rotates assignments so each team ends up with the same headcount (give or take one), which is exactly what you want for competitive play.",
          "The animated wheel draw makes team selection visually engaging and completely transparent — everyone can watch the process, eliminating the perception of favoritism that comes with manual team picking. Each spin assigns one player to the next team in rotation, building the complete team roster in a series of satisfying reveals.",
          "Everything happens in your browser. Names never leave your device, there are no accounts to create, and there's no upload step. Need a different split? Hit Shuffle Again and the tool re-randomizes instantly without resetting your players or team names. When you're done, one click copies a tidy plain-text roster to your clipboard so you can paste it into a group chat, a whiteboard, or a tournament bracket.",
          "Works for any team-making scenario: pickup sports, classroom project groups, office team-building, quiz nights, escape rooms, gaming sessions, or any activity where you need to divide a group into teams quickly and fairly. Supports 2 to 10 teams and any number of players.",
        ]}
        faqs={[
          {
            question: "How many teams can I create?",
            answer:
              "Between 2 and 10 teams. The tool distributes players as evenly as possible, with larger teams getting one extra player when the group doesn't divide evenly.",
          },
          {
            question: "Can I name the teams?",
            answer: "Yes. Each team has an editable name. Set custom team names before or after the draw.",
          },
          {
            question: "What if I want to re-randomize?",
            answer:
              "Click Shuffle Again to instantly re-randomize the entire team assignment without changing your player list or team configuration.",
          },
          {
            question: "Can I copy the team roster?",
            answer:
              "Yes. A copy button exports the complete team assignments as plain text, ready to paste into a chat, document, or tournament bracket.",
          },
          {
            question: "Does the tool store my player names?",
            answer: "No. Everything runs locally in your browser. Player names never leave your device.",
          },
          {
            question: "How are teams balanced?",
            answer:
              "Players are randomly assigned in a rotating pattern — player 1 goes to team 1, player 2 to team 2, and so on — ensuring each team gets the same number of players (or one team gets an extra if the count is uneven).",
          },
          {
            question: "Can I use this for sports teams?",
            answer:
              "Yes. It's commonly used for pickup football, basketball, volleyball, and other sports where you need to split a group into equal sides quickly and fairly.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The wheel animation and team configuration are fully responsive and work on smartphones and tablets.",
          },
        ]}
      />

      <RelatedTools currentSlug="random-team-maker" />
    </ToolPageShell>
  );
}
