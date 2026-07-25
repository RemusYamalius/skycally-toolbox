import { createFileRoute } from "@tanstack/react-router";
import { buildPageMeta, toolBySlug, SITE_URL } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, RotateCw, Minus, Copy, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/role-spinner")({
  head: () => {
    const tool = toolBySlug("role-spinner", tools);
    const title = "Mafia Role Spinner — Free Random Role Generator for Party Games | Skycally";
    const description =
      "Free Mafia role spinner and random role generator. Assign secret roles for Mafia, Werewolf, Among Us and other party games — no signup, private, browser-based.";
    const base = buildPageMeta({ title, description, path: tool.path });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Role Spinner",
            alternateName: [
              "Mafia Role Generator",
              "Mafia Roles Generator",
              "Random Role Generator",
              "Secret Role Picker",
            ],
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: `${SITE_URL}${tool.path}`,
            description,
            featureList: tool.featureList ?? [],
          }),
        },
      ],
    };
  },
  component: RoleSpinner,
});

const PALETTE = ["#06b6d4", "#a855f7", "#f97316", "#22c55e", "#ec4899", "#eab308", "#3b82f6", "#ef4444"];

type Phase = "setup" | "spinName" | "spinRole" | "done";
type Role = { name: string; count: number; color: string };
type Assignment = { name: string; role: string; color: string };
type Segment = { label: string; color: string };

const DEFAULT_PLAYERS = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];
const DEFAULT_ROLES: Role[] = [
  { name: "Mafia", count: 1, color: "#ef4444" },
  { name: "Doctor", count: 1, color: "#22c55e" },
  { name: "Sheriff", count: 1, color: "#f59e0b" },
  { name: "Citizen", count: 3, color: "#3b82f6" },
];

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

function RoleSpinner() {
  const tool = toolBySlug("role-spinner", tools);

  const [phase, setPhase] = useState<Phase>("setup");
  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [playerInput, setPlayerInput] = useState("");
  const [roleInput, setRoleInput] = useState("");

  const [remainingPlayers, setRemainingPlayers] = useState<string[]>([]);
  const [remainingRoles, setRemainingRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [currentName, setCurrentName] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<{ name: string; color: string } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);

  const playersTotal = players.length;
  const rolesTotal = useMemo(() => roles.reduce((s, r) => s + r.count, 0), [roles]);
  const countsMatch = playersTotal === rolesTotal && playersTotal >= 2;

  // segments for current phase
  const nameSegments: Segment[] = useMemo(
    () => remainingPlayers.map((p, i) => ({ label: p, color: PALETTE[i % PALETTE.length] })),
    [remainingPlayers],
  );
  const roleSegments: Segment[] = useMemo(
    () =>
      remainingRoles.flatMap((r) =>
        Array(r.count)
          .fill(null)
          .map(() => ({ label: r.name, color: r.color })),
      ),
    [remainingRoles],
  );

  const addPlayer = () => {
    const v = playerInput.trim();
    if (!v) return;
    setPlayers((p) => [...p, v]);
    setPlayerInput("");
  };
  const removePlayer = (i: number) => setPlayers((p) => (p.length > 2 ? p.filter((_, idx) => idx !== i) : p));

  const addRole = () => {
    const v = roleInput.trim();
    if (!v) return;
    setRoles((r) => [...r, { name: v, count: 1, color: PALETTE[r.length % PALETTE.length] }]);
    setRoleInput("");
  };
  const removeRole = (i: number) => setRoles((r) => r.filter((_, idx) => idx !== i));
  const adjustCount = (i: number, delta: number) =>
    setRoles((r) => r.map((x, idx) => (idx === i ? { ...x, count: Math.max(0, x.count + delta) } : x)));

  const startGame = () => {
    setRemainingPlayers([...players]);
    setRemainingRoles(roles.filter((r) => r.count > 0).map((r) => ({ ...r })));
    setAssignments([]);
    setCurrentName(null);
    setCurrentRole(null);
    setRotation(0);
    setPhase("spinName");
  };

  const playAgain = () => {
    setAssignments([]);
    setRemainingPlayers([]);
    setRemainingRoles([]);
    setCurrentName(null);
    setCurrentRole(null);
    setRotation(0);
    setPhase("setup");
  };

  const copyResults = async () => {
    const lines = ["Player\tRole", ...assignments.map((a) => `${a.name}\t${a.role}`)];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Results copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const spin = (segments: Segment[], onLand: (index: number) => void) => {
    if (spinning || segments.length < 1) return;
    setSpinning(true);
    const n = segments.length;
    const target = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const targetCenterDeg = target * seg + seg / 2;
    const turns = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + turns * 360 + (360 - targetCenterDeg) - (rotation % 360);
    const start = performance.now();
    const duration = 4200;
    const from = rotation;
    const delta = finalRotation - from;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setRotation(from + delta * eased);
      if (p < 1) requestAnimationFrame(tick);
      else {
        setSpinning(false);
        onLand(target);
      }
    };
    requestAnimationFrame(tick);
  };

  const spinName = () => {
    if (currentName) return;
    spin(nameSegments, (i) => setCurrentName(nameSegments[i].label));
  };

  const goToRolePhase = () => {
    setRotation(0);
    setCurrentRole(null);
    setPhase("spinRole");
  };

  const spinRole = () => {
    if (currentRole) return;
    spin(roleSegments, (i) => {
      const picked = roleSegments[i];
      setCurrentRole({ name: picked.label, color: picked.color });
      setRevealOpen(true);
    });
  };

  const nextPlayer = () => {
    if (!currentName || !currentRole) return;
    const newAssignments = [...assignments, { name: currentName, role: currentRole.name, color: currentRole.color }];
    const newRemainingPlayers = remainingPlayers.filter((p) => p !== currentName);
    const newRemainingRoles = remainingRoles
      .map((r) => (r.name === currentRole.name ? { ...r, count: r.count - 1 } : r))
      .filter((r) => r.count > 0);

    setAssignments(newAssignments);
    setRemainingPlayers(newRemainingPlayers);
    setRemainingRoles(newRemainingRoles);
    setCurrentName(null);
    setCurrentRole(null);
    setRotation(0);
    setRevealOpen(false);

    if (newRemainingPlayers.length === 0) setPhase("done");
    else setPhase("spinName");
  };

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

          {/* Roles */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Roles ({rolesTotal})</h2>
            </div>
            <div className="flex gap-2 mb-3">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                placeholder="Add custom role"
              />
              <Button onClick={addRole} variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {roles.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="flex-1 truncate">{r.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => adjustCount(i, -1)} disabled={r.count <= 0}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-6 text-center font-mono">{r.count}</span>
                    <Button variant="ghost" size="icon" onClick={() => adjustCount(i, 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRole(i)} aria-label="Remove role">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col items-center gap-3">
            {!countsMatch && (
              <p className="text-sm text-red-500 text-center">
                ⚠️ Roles total ({rolesTotal}) must equal players total ({playersTotal})
              </p>
            )}
            <Button onClick={startGame} disabled={!countsMatch} size="lg" className="px-10">
              Start Game
            </Button>
          </div>
        </div>
      )}

      {phase === "spinName" && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground">
            {remainingPlayers.length} player{remainingPlayers.length === 1 ? "" : "s"} left
          </p>
          <Wheel segments={nameSegments} rotation={rotation} />
          {!currentName ? (
            <Button onClick={spinName} disabled={spinning} size="lg" className="px-10">
              <RotateCw className={`w-4 h-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
              {spinning ? "Spinning…" : "Spin Name"}
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="px-8 py-4 rounded-2xl border-2 border-[var(--cyan-brand)] bg-card animate-pulse">
                <p className="font-display text-3xl font-bold">🎯 {currentName}</p>
              </div>
              <Button onClick={goToRolePhase} size="lg">
                Spin Role <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === "spinRole" && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground">
            Assigning role to <span className="font-semibold text-foreground">{currentName}</span>
          </p>
          <Wheel segments={roleSegments} rotation={rotation} />
          {!currentRole && (
            <Button onClick={spinRole} disabled={spinning} size="lg" className="px-10">
              <RotateCw className={`w-4 h-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
              {spinning ? "Spinning…" : "Spin Role"}
            </Button>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-display">Player</th>
                  <th className="px-4 py-3 font-display">Role</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3">{a.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                        {a.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={playAgain}>
              <RefreshCw className="w-4 h-4 mr-2" /> Play Again
            </Button>
            <Button onClick={copyResults}>
              <Copy className="w-4 h-4 mr-2" /> Copy Results
            </Button>
          </div>
        </div>
      )}

      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-wide text-muted-foreground">Role assigned</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="font-display text-2xl font-bold">👤 {currentName}</p>
            <div className="h-px bg-border" />
            <p className="font-display text-3xl font-bold inline-flex items-center gap-3 justify-center">
              <span className="w-4 h-4 rounded-full" style={{ background: currentRole?.color }} />
              {currentRole?.name}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={nextPlayer}>
              {remainingPlayers.length <= 1 ? "Finish" : "Next Player"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdZone id="role-spinner-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Add player names and set how many of each role you need.",
          "Spin the name wheel to pick a random player, then spin the role wheel to assign their role.",
          "Repeat until all players have a secret role — then share the results!",
        ]}
      />

      <ToolSeoContent
        title="Free Role Spinner — Assign Secret Roles for Mafia & Party Games"
        description="Randomly assign secret roles for Mafia, Werewolf, Among Us, and other social deduction games. Free, private, browser-based role spinner. No signup."
        body={[
          "Skycally's Role Spinner takes the awkwardness out of distributing secret roles for social deduction games. Add your players, configure how many Mafia, Doctors, Sheriffs, Citizens — or any custom roles — you want in play, then let the spinner do the rest. A first wheel picks a random player, and a second wheel assigns them a role drawn from the remaining pool, ensuring every game starts with a perfectly fair, fully randomized setup.",
          "The spinner supports any combination of named roles — perfect for Mafia, Werewolf, Secret Hitler, Among Us-style party games, classroom activities, team-building exercises, or any moment when you need to hand out hidden identities without arguments. Role counts are configurable, so you can tailor the game balance for any group size from 4 to 20+ players.",
          "Everything runs locally in your browser: names and roles never leave your device, making it safe to use even when someone is screen-sharing. Once all roles are assigned, copy the full assignment table with one click for moderators or post-game recaps. The animated dual-wheel presentation builds suspense and makes each reveal a moment.",
          "Unlike passing folded pieces of paper or whispering roles, the spinner provides a transparent process everyone can watch without seeing each other's results. Each player receives their role privately on their own screen, maintaining the secrecy that social deduction games depend on.",
        ]}
        faqs={[
          {
            question: "Is this the same as a Mafia role generator?",
            answer:
              "Yes. 'Role spinner', 'Mafia role generator', 'mafia roles generator' and 'random role generator' all describe the same tool here — assigning secret roles like Mafia, Doctor, Sheriff and Citizen fairly and randomly to a group of players.",
          },
          {
            question: "What games is this suitable for?",
            answer:
              "Mafia, Werewolf, Secret Hitler, Town of Salem, Among Us, Avalon, One Night Ultimate Werewolf, and any other social deduction or hidden role game. It also works for classroom role-play and team-building activities.",
          },
          {
            question: "How many players and roles can I add?",
            answer:
              "There is no hard limit. The spinner works for any group size — typically 4 to 20+ players. Add as many custom role types as your game requires.",
          },
          {
            question: "Can I create custom roles?",
            answer:
              "Yes. You can define any role name and set how many players receive that role. Perfect for custom game variants or creating unique role sets for your group.",
          },
          {
            question: "Is the role assignment private?",
            answer:
              "Each player's role is revealed on their own screen — other players cannot see it unless they look at the same device. This maintains the secrecy that social deduction games require.",
          },
          {
            question: "Can I copy the full assignment list?",
            answer:
              "Yes. After all roles are assigned, a copy button lets you export the complete player-role table as plain text for moderators or record-keeping.",
          },
          {
            question: "Does the role assignment stay on the server?",
            answer:
              "No. All assignments happen locally in your browser. Nothing is sent to any server, making it safe to use with shared screens or in sensitive environments.",
          },
          {
            question: "Can I re-spin if someone gets the wrong role?",
            answer:
              "Yes. You can reset and re-run the spinner at any time without losing your player or role configuration.",
          },
          {
            question: "Does this work on mobile?",
            answer:
              "Yes. The spinner and role configuration are fully responsive and work on smartphones, tablets, and desktops.",
          },
        ]}
      />

      <RelatedTools currentSlug="role-spinner" />
    </ToolPageShell>
  );
}
