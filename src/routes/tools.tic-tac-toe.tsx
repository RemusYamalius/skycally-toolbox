import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Eraser } from "lucide-react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
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
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
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
  b.forEach((c, i) => {
    if (!c) empty.push(i);
  });
  if (empty.length === 0) return -1;
  if (difficulty === "easy") return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === "medium") {
    return Math.random() > 0.5 ? getBestMove(b) : empty[Math.floor(Math.random() * empty.length)];
  }
  return getBestMove(b);
}

function TicTacToePage() {
  const [board, setBoard] = useState<Cell[]>(() => Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const [mode, setMode] = useState<Mode>("pvp");
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    const result = checkWinner(board);
    if (!result) return;
    if (result === "draw") {
      setWinner("draw");
      setWinLine(null);
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      playSound("fail");
    } else {
      setWinner(result.winner);
      setWinLine(result.line);
      setScores((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
      playChord(["success", "win"]);
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
    return () => {
      clearTimeout(t);
      setAiThinking(false);
    };
  }, [isX, mode, winner, difficulty]);

  const handleClick = useCallback(
    (i: number) => {
      if (winner || board[i]) return;
      if (mode === "ai" && !isX) return;
      const mark: Cell = isX ? "X" : "O";
      const next = [...board];
      next[i] = mark;
      setBoard(next);
      setIsX((v) => !v);
      playSound("click");
    },
    [board, isX, winner, mode],
  );

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
    <ToolPageShell
      title="Tic Tac Toe"
      description="Classic X and O. Play against a friend or challenge the AI on Easy, Medium or Hard."
    >
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        {/* Mode + difficulty */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => {
                setMode("pvp");
                newGame();
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                mode === "pvp" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary",
              )}
            >
              Player vs Player
            </button>
            <button
              onClick={() => {
                setMode("ai");
                newGame();
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                mode === "ai" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary",
              )}
            >
              Player vs AI
            </button>
          </div>
          {mode === "ai" && (
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    newGame();
                  }}
                  className={cn(
                    "px-3 py-2 text-sm font-medium capitalize transition-colors",
                    difficulty === d
                      ? "bg-secondary text-foreground"
                      : "bg-background hover:bg-secondary/60 text-muted-foreground",
                  )}
                >
                  {d}
                </button>
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
          <Button onClick={newGame} className="gap-2">
            <RefreshCw className="w-4 h-4" /> New Game
          </Button>
          <Button onClick={resetScores} variant="outline" className="gap-2">
            <Eraser className="w-4 h-4" /> Reset Scores
          </Button>
        </div>
        {aiThinking && <p className="sr-only">AI is thinking</p>}
      </div>

      <AdZone id="tic-tac-toe-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose Player vs Player or Player vs AI mode.",
          "Click any square to place your mark — X always goes first.",
          "Get three in a row to win. Beat the AI on Hard if you can!",
        ]}
      />

      <ToolSeoContent
        title="Free Tic Tac Toe Game Online — Play vs AI or a Friend"
        description="Play Tic Tac Toe free online against an AI or a friend on the same device. Classic 3x3 grid, instant play, no signup required."
        body={[
          "Skycally's Tic Tac Toe lets you play the classic 3×3 grid game against a smart AI opponent or a friend on the same device. Choose X or O, click any empty cell to place your mark, and try to get three in a row — horizontally, vertically, or diagonally — before your opponent does.",
          "The AI uses a minimax algorithm to play optimally — it never makes a strategic mistake. Against a perfect AI, the best outcome for a human is a draw. This makes Tic Tac Toe a great way to understand game theory: with optimal play from both sides, the game always ends in a draw, making it a classic example of a 'solved game' in mathematics.",
          "Two-player mode lets two people play on the same device, taking turns — perfect for a quick game with a friend or family member. The score tracker keeps a running tally of wins, losses, and draws across multiple rounds so you can have a proper match.",
          "Tic Tac Toe has been played for thousands of years under various names — it appears in ancient Egypt and was known as 'noughts and crosses' in the UK. The first known computer implementation was OXO, created by Alexander Douglas in 1952 as part of his PhD thesis on human-computer interaction — making it one of the earliest video games ever created.",
        ]}
        faqs={[
          {
            question: "How do I play Tic Tac Toe?",
            answer:
              "Click any empty cell to place your mark (X or O). Get three of your marks in a row — horizontally, vertically, or diagonally — to win. If all 9 cells are filled with no winner, the game is a draw.",
          },
          {
            question: "Can I play against a friend?",
            answer: "Yes. Select 2 Player mode and take turns clicking cells on the same device.",
          },
          {
            question: "How strong is the AI?",
            answer:
              "The AI uses the minimax algorithm and plays perfectly — it never makes a strategic mistake. The best result against the AI is a draw with optimal play.",
          },
          {
            question: "Can Tic Tac Toe always end in a draw?",
            answer:
              "Yes. With perfect play from both sides, Tic Tac Toe always ends in a draw. This is why it's called a 'solved game' — the optimal outcome is determined by mathematics.",
          },
          {
            question: "Does the game track my score?",
            answer:
              "Yes. A score counter tracks wins, losses, and draws across multiple rounds in the current session.",
          },
          {
            question: "Who goes first?",
            answer: "X always goes first by default. You can choose whether to play as X or O before the game starts.",
          },
          {
            question: "Can I undo a move?",
            answer: "No — once placed, marks are permanent. Start a new game to try a different strategy.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. The grid is touch-friendly and scales to fit any screen size.",
          },
        ]}
      />

      <RelatedTools currentSlug="tic-tac-toe" />
    </ToolPageShell>
  );
}
