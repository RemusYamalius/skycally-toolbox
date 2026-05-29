# Add Typing Speed Test to Mini Games

## Step 1 — Update `src/lib/tools.ts`
- Add `Keyboard` to the `lucide-react` import line.
- Append new tool entry after `word-search`:
  ```ts
  { slug: "typing-speed", name: "Typing Speed Test", description: "Test your typing speed and accuracy! How many words per minute can you type?", category: "minigames", icon: Keyboard, path: "/tools/typing-speed" },
  ```

## Step 2 — Create `src/routes/tools.typing-speed.tsx`
Mirror the file structure of `src/routes/tools.word-search.tsx` (route export, head meta via `buildToolMeta`, `ToolPageShell` + `HowToUse` + `RelatedTools` + `ToolSeoContent`).

Implementation per spec:
- **Data**: `QUOTE_BANK` (General, Technology, Motivational, Science) and `CONFIG` (easy 60s / medium 30s / hard 15s).
- **State**: difficulty, category, quote, input, phase (`setup` | `playing` | `done`), timeLeft, started, result, best (persisted to `localStorage` key `typing-best-wpm`), textarea ref.
- **Logic**:
  - `startGame` picks random quote from selected category, resets state, focuses textarea.
  - Timer effect ticks once per second after first keystroke; calls `finishGame` at 0.
  - `finishGame` word-by-word comparison → WPM = `correct / duration * 60`, accuracy = `correct / typedWords * 100`; updates best.
  - `handleInput` starts timer on first keystroke; blocks input when time up.
  - `renderQuote` colors each char (green correct / red wrong / muted untyped) with pulsing cursor at current position.
  - `liveWpm` memo from elapsed seconds.
- **UI**:
  - Setup screen: category buttons (4), difficulty buttons (3), Start button.
  - Playing screen: timer + live WPM + best WPM bar, progress bar, quote display (mono), textarea input.
  - Done screen: fixed overlay with WPM, accuracy, correct/incorrect grid, "New Personal Best" badge, Try Again + Change Settings buttons.
- **SEO**:
  - `HowToUse` steps as specified.
  - `ToolSeoContent` with required title, description, 2-paragraph body, 4 FAQs (WPM calc, timer start, categories, improvement tips).
- English only. Use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `text-primary`, etc.) consistent with other mini-game routes. The route file is auto-registered by the TanStack Router Vite plugin — do not hand-edit `routeTree.gen.ts`.

## Files
- edit: `src/lib/tools.ts`
- create: `src/routes/tools.typing-speed.tsx`
