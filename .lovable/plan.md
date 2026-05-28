# Add Role Spinner Tool

## 1. Register the tool (`src/lib/tools.ts`)

- Extend the lucide-react import line with `Shuffle` and `Users`.
- Append to the `tools` array (utility category):

```ts
{ slug: "role-spinner", name: "Role Spinner", description: "Randomly assign roles to players. Perfect for Mafia, party games and team activities.", category: "utility", icon: Shuffle, path: "/tools/role-spinner" },
```

The route auto-registers via TanStack Router's file-based routing (no manual edit to `routeTree.gen.ts`).

## 2. Create `src/routes/tools.role-spinner.tsx`

Mirror the structure of `tools.spinning-wheel.tsx`: same imports, `createFileRoute("/tools/role-spinner")`, `buildToolMeta(toolBySlug("role-spinner", tools))`, `ToolPageShell` wrapper, `HowToUse`, `ToolSeoContent`, `RelatedTools` at the bottom. All copy in English.

### State

```ts
type Phase = "setup" | "spinName" | "spinRole" | "done";
type Role = { name: string; count: number; color: string };
type Assignment = { name: string; role: string; color: string };

const [phase, setPhase] = useState<Phase>("setup");
const [players, setPlayers] = useState<string[]>(["Alice","Bob","Charlie","Diana","Eve","Frank"]);
const [roles, setRoles] = useState<Role[]>([
  { name: "Mafia", count: 1, color: "#ef4444" },
  { name: "Doctor", count: 1, color: "#22c55e" },
  { name: "Sheriff", count: 1, color: "#f59e0b" },
  { name: "Citizen", count: 3, color: "#3b82f6" },
]);
const [remainingPlayers, setRemainingPlayers] = useState<string[]>([]);
const [remainingRoles, setRemainingRoles] = useState<Role[]>([]); // working copy with decreasing counts
const [assignments, setAssignments] = useState<Assignment[]>([]);
const [currentName, setCurrentName] = useState<string | null>(null);
const [currentRole, setCurrentRole] = useState<{name:string;color:string} | null>(null);
const [rotation, setRotation] = useState(0);
const [spinning, setSpinning] = useState(false);
const [revealOpen, setRevealOpen] = useState(false);
```

### Phase 1 — Setup (two-column grid)

Left card "Players": input + Add button, list of name chips each with `Trash2` delete. Min 2 enforced (delete disabled at 2).

Right card "Roles": list of role rows showing color dot, name, `-` / count / `+` buttons, and delete. Input + Add for custom role (color auto-assigned from PALETTE based on roles.length).

Totals row: `playersTotal = players.length`, `rolesTotal = sum(roles[i].count)`. If unequal, render red warning `⚠️ Roles total (X) must equal players total (Y)`.

`Start Game` button disabled unless equal and players ≥ 2. On click:
- `setRemainingPlayers([...players])`
- `setRemainingRoles(roles.map(r => ({...r})))`
- `setAssignments([])`
- `setPhase("spinName")`

### Phase 2 — Name Spin

Canvas + pointer + `Spin Name` button. Reuse spinning-wheel's drawWheel logic (DPR, segments, rotation, hub, pointer triangle) with `options = remainingPlayers`, color cycling from PALETTE by index. Same `spin()` easing function setting `currentName` on land. After land, show large badge `🎯 {currentName}` with `animate-pulse` class, then `Spin Role →` button → `setPhase("spinRole"); setRotation(0); setCurrentRole(null)`.

### Phase 3 — Role Spin

Build segments from remainingRoles:
```ts
const roleSegments = remainingRoles.flatMap(r => Array(r.count).fill({name:r.name, color:r.color}));
```
Draw the same wheel but use `segment.color` for fill (override PALETTE) and `segment.name` as label. `Spin Role` button triggers same spin logic; on land set `currentRole` and open the reveal `Dialog` (from `@/components/ui/dialog`) showing:
```
👤 {currentName}
─────────
● {currentRole.name}    (colored dot)
```
Dialog footer: `Next Player →` button which:
- pushes `{name: currentName, role: currentRole.name, color: currentRole.color}` into `assignments`
- removes `currentName` from `remainingPlayers`
- decrements that role's count in `remainingRoles` (filter out if count hits 0)
- closes dialog, resets `currentName`/`currentRole`/`rotation`
- if `remainingPlayers.length - 1 === 0` → `setPhase("done")`, else `setPhase("spinName")`

### Phase 4 — Done

Card with table (Player | Role) rendering each assignment; colored dot before role name.

Buttons:
- `Play Again` → reset all state back to Phase 1 defaults (or keep configured players/roles? — reset to Phase 1 with the configured players/roles preserved and assignments cleared).
- `Copy Results` → build plain-text table `"Player\tRole\nAlice\tMafia\n..."` and `navigator.clipboard.writeText(...)`, show a brief toast via `sonner` (already in project).

### Wheel drawing reuse

Copy spinning-wheel's `containerRef`/`ResizeObserver`, `canvasRef`, draw `useEffect`, and `spin()` easing into this file (adapted so it accepts a segments array + per-segment color). Pointer and hub identical.

### PALETTE

Reuse the same constant:
```ts
const PALETTE = ["#06b6d4","#a855f7","#f97316","#22c55e","#ec4899","#eab308","#3b82f6","#ef4444"];
```

### HowToUse + ToolSeoContent

`HowToUse` steps exactly as specified. `ToolSeoContent` with the supplied title/description, 2-paragraph body about random role assignment for Mafia/Werewolf/party games and browser-local privacy, 4 FAQs (how it works, supported games, custom roles, privacy).

## Out of scope

No changes to other files, no business logic changes, no routing config edits beyond the new route file, no edits to `routeTree.gen.ts` (auto-generated).
