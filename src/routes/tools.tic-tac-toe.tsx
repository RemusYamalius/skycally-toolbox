import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Eraser } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/tic-tac-toe")({
  head: () => buildToolMeta(toolBySlug("tic-tac-toe", tools)),
  component: TicTacToePage,
});

type Cell = "X" | "O" | null;
type Mode = "pvp" | "ai";
type Difficulty = "easy" | "medium" | "hard";

const LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type WinResult = { winner: "X" | "O"; line: number[] } | "draw" | null;

function checkWinner(b: Cell[]): WinResult {
  for (const [a, b2, c] of LINES) {
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) {
      return { winner: b[a]!, line: [a, b2, c] };
    }
  }
  if (b.every(Boolean)) return "draw";
  return null;
}

function minimax(b: Cell[], isMaximizing: boolean, depth: number): number {
  const result = checkWinner(b);
  if (result === "draw") return 0;
  if (result && typeof result === "object") {
    return result.winner === "O" ? 10 - depth : depth - 10;
  }
  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = "O";
        best = Math.max(best, minimax(b, false, depth + 1));
        b[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = "X";
        best = Math.min(best, minimax(b, true, depth + 1));
        b[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(b: Cell[]): number {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = "O";
      const val = minimax(b, false, 0);
      b[i] = null;
      if (val > bestVal) {
        bestVal = val;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

function getAIMove(b: Cell[], difficulty: Difficulty): number {
  const empty: number[] = [];
  b.forEach((c, i) => { if (!c) empty.push(i); });
  if (empty.length === 0) return -1;
  if (difficulty === "easy") return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === "medium") {
    return Math.random() > 0.5
      ? getBestMove(b)
      : empty[Math.floor(Math.random() * empty.length)];
  }
  return getBestMove(b);
}

function TicTacToePage() {
  const tool = toolBySlug("tic-tac-toe", tools);

  const [board, setBoard] = useState<Cell[]>(() => Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const [mode, setMode] = useState<Mode>("pvp");
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // Check winner after every board change
  useEffect(() => {
    const result = checkWinner(board);
    if (!result) return;
    if (result === "draw") {
      setWinner("draw");
      setWinLine(null);
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
    } else {
      setWinner(result.winner);
      setWinLine(result.line);
      setScores((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
    }
  }, [board]);

  // AI turn
  useEffect(() => {
    if (mode !== "ai" || isX || winner) return;
    setAiThinking(true);
    const t = setTimeout(() => {
      setBoard((cur) => {
        if (checkWinner(cur)) return cur;
        const move = getAIMove([...cur], difficulty);
        if (move < 0) return cur;
        const next = [...cur];
        next[move] = "O";
        return next;
      });
      setIsX(true);
      setAiThinking(false);
    }, 400);
    return () => { clearTimeout(t); setAiThinking(false); };
  }, [isX, mode, winner, difficulty]);

  const handleClick = useCallback((i: number) => {
    if (winner || board[i]) return;
    if (mode === "ai" && !isX) return;
    const mark: Cell = isX ? "X" : "O";
    const next = [...board];
    next[i] = mark;
    setBoard(next);
    setIsX((v) => !v);
  }, [board, isX, winner, mode]);

  const newGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsX(true);
    setWinner(null);
    setWinLine(null);
  }, []);

  const resetScores = useCallback(() => {
    setScores({ X: 0, O: 0, draws: 0 });
    newGame();
  }, [newGame]);

  const status = useMemo(() => {
    if (winner === "draw") return "🤝 It's a draw!";
    if (winner === "X") return mode === "ai" ? "🎉 You win!" : "🎉 X wins!";
    if (winner === "O") return mode === "ai" ? "🤖 AI wins!" : "🎉 O wins!";
    if (mode === "ai") return isX ? "Your turn (X)" : "AI is thinking…";
    return isX ? "X's turn" : "O's turn";
  }, [winner, isX, mode]);

  return (
    <ToolPageShell title="Tic Tac Toe" description="Classic X and O. Play against a friend or challenge the AI on Easy, Medium or Hard.">
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {/* Mode + difficulty */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setMode("pvp"); newGame(); }}
              className={cn("px-4 py-2 text-sm font-medium transition-colors", mode === "pvp" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}
            >Player vs Player</button>
            <button
              onClick={() => { setMode("ai"); newGame(); }}
              className={cn("px-4 py-2 text-sm font-medium transition-colors", mode === "ai" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary")}
            >Player vs AI</button>
          </div>
          {mode === "ai" && (
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d); newGame(); }}
                  className={cn("px-3 py-2 text-sm font-medium capitalize transition-colors", difficulty === d ? "bg-secondary text-foreground" : "bg-background hover:bg-secondary/60 text-muted-foreground")}
                >{d}</button>
              ))}
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-6">
          <div className="text-center px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 min-w-[80px]">
            <p className="text-xs text-cyan-400 font-bold">X {mode === "ai" ? "(You)" : ""}</p>
            <p className="text-2xl font-black text-cyan-400">{scores.X}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-muted min-w-[80px]">
            <p className="text-xs text-muted-foreground font-bold">Draws</p>
            <p className="text-2xl font-black text-foreground">{scores.draws}</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 min-w-[80px]">
            <p className="text-xs text-violet-400 font-bold">O {mode === "ai" ? "(AI)" : ""}</p>
            <p className="text-2xl font-black text-violet-400">{scores.O}</p>
          </div>
        </div>

        {/* Status */}
        <p className="text-center text-sm font-medium text-muted-foreground mb-4 h-5">{status}</p>

        {/* Board */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto">
          {board.map((cell, i) => {
            const disabled = !!cell || !!winner || (mode === "ai" && !isX);
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={disabled}
                className={cn(
                  "aspect-square rounded-2xl text-4xl sm:text-5xl font-black flex items-center justify-center transition-all duration-150",
                  "border-2 border-border",
                  !disabled && "hover:border-primary/50 hover:bg-secondary/50 cursor-pointer",
                  winLine?.includes(i) && "border-primary bg-primary/20",
                  cell === "X" ? "text-cyan-400" : "text-violet-400",
                )}
                aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ", empty"}`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Button onClick={newGame} className="gap-2"><RefreshCw className="w-4 h-4" /> New Game</Button>
          <Button onClick={resetScores} variant="outline" className="gap-2"><Eraser className="w-4 h-4" /> Reset Scores</Button>
        </div>
        {aiThinking && <p className="sr-only">AI is thinking</p>}
      </div>

      <HowToUse steps={[
        "Choose Player vs Player or Player vs AI mode.",
        "Click any square to place your mark — X always goes first.",
        "Get three in a row to win. Beat the AI on Hard if you can!",
      ]} />

      <ToolSeoContent
        title="Tic Tac Toe — Play Online Free vs Friend or AI"
        description="Play Tic Tac Toe online for free. Challenge a friend in local multiplayer or play against AI with Easy, Medium and Hard difficulty."
        body={[
          "Tic Tac Toe (also known as Noughts and Crosses) is the timeless 3×3 strategy game that takes seconds to learn and a lifetime to master. Our free online version runs entirely in your browser — no sign-up, no ads, no downloads — and works equally well on desktop, tablet and mobile.",
          "Sharpen your skills against the AI opponent powered by the classic Minimax algorithm. Easy mode plays random moves so beginners can win, Medium mixes smart and random play, and Hard never loses — the best you can do is force a draw. Or grab a friend and play locally in Player vs Player mode with a running scoreboard that tracks wins and draws for the session.",
        ]}
        faqs={[
          { question: "Can I beat the AI on Hard difficulty?", answer: "No — Hard mode uses a perfect Minimax algorithm, so the best result you can get is a draw. If you ever lose to the AI on Hard, it means you missed a forced win or block." },
          { question: "Is there a two-player local mode?", answer: "Yes. Switch to Player vs Player and take turns on the same device. X always moves first; the scoreboard tracks wins and draws until you reset it." },
          { question: "Does it work on mobile?", answer: "Absolutely. The board is touch-friendly and scales to your screen size, so you can play on phones and tablets without any app install." },
          { question: "Are my scores saved?", answer: "Scores reset when you reload the page, keeping each session clean. Use the New Game button to start a fresh round while keeping your current scoreboard." },
        ]}
      />

      {tool && <RelatedTools currentSlug={tool.slug} category={tool.category} />}
    </ToolPageShell>
  );
}
