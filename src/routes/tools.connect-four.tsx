import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/connect-four")({
  head: () => buildToolMeta(toolBySlug("connect-four", tools)),
  component: ConnectFourPage,
});

// ============ Constants ============
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const HUMAN = 1;
const AI = 2;

type Cell = 0 | 1 | 2;
type Board = Cell[][];
type Phase = "idle" | "playing" | "won" | "draw";
type Difficulty = "easy" | "medium" | "hard";

const AI_DEPTH: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6 };

const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY) as Cell[]);

// ============ Engine ============
const dropDisc = (board: Board, col: number, player: Cell): Board | null => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) {
      const next = board.map((row) => [...row]);
      next[r][col] = player;
      return next;
    }
  }
  return null;
};

const checkWinner = (board: Board): { player: Cell; cells: [number, number][] } | null => {
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p === EMPTY) continue;
      for (const [dr, dc] of directions) {
        const cells: [number, number][] = [[r, c]];
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== p) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return { player: p, cells };
      }
    }
  }
  return null;
};

const isDraw = (board: Board): boolean => board[0].every((cell) => cell !== EMPTY);

const getValidCols = (board: Board): number[] =>
  Array.from({ length: COLS }, (_, c) => c).filter((c) => board[0][c] === EMPTY);

// ============ AI scoring ============
const scoreWindow = (window: Cell[], player: Cell): number => {
  const opp: Cell = player === AI ? HUMAN : AI;
  const pCount = window.filter((c) => c === player).length;
  const eCount = window.filter((c) => c === EMPTY).length;
  const oCount = window.filter((c) => c === opp).length;
  if (pCount === 4) return 100;
  if (pCount === 3 && eCount === 1) return 5;
  if (pCount === 2 && eCount === 2) return 2;
  if (oCount === 3 && eCount === 1) return -4;
  return 0;
};

const scoreBoard = (board: Board, player: Cell): number => {
  let score = 0;
  const centerCol = board.map((r) => r[Math.floor(COLS / 2)]);
  score += centerCol.filter((c) => c === player).length * 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow(board[r].slice(c, c + 4) as Cell[], player);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], player);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]], player);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      score += scoreWindow([board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]], player);
    }
  }
  return score;
};

const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): { score: number; col: number } => {
  const result = checkWinner(board);
  if (result?.player === AI) return { score: 100000 + depth, col: -1 };
  if (result?.player === HUMAN) return { score: -100000 - depth, col: -1 };
  if (isDraw(board) || depth === 0) return { score: scoreBoard(board, AI), col: -1 };

  const cols = getValidCols(board);
  // Order columns: center-first for better pruning
  cols.sort((a, b) => Math.abs(a - Math.floor(COLS / 2)) - Math.abs(b - Math.floor(COLS / 2)));

  if (maximizing) {
    let best = { score: -Infinity, col: cols[0] };
    for (const col of cols) {
      const next = dropDisc(board, col, AI)!;
      const { score } = minimax(next, depth - 1, alpha, beta, false);
      if (score > best.score) best = { score, col };
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = { score: Infinity, col: cols[0] };
    for (const col of cols) {
      const next = dropDisc(board, col, HUMAN)!;
      const { score } = minimax(next, depth - 1, alpha, beta, true);
      if (score < best.score) best = { score, col };
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
};

// ============ Component ============
function ConnectFourPage() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<1 | 2>(HUMAN);
  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [winCells, setWinCells] = useState<[number, number][]>([]);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [scores, setScores] = useState({ human: 0, ai: 0, draws: 0 });
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const getAIMove = (b: Board): number => {
    if (difficulty === "easy" && Math.random() < 0.3) {
      const cols = getValidCols(b);
      return cols[Math.floor(Math.random() * cols.length)];
    }
    const { col } = minimax(b, AI_DEPTH[difficulty], -Infinity, Infinity, true);
    return col >= 0 ? col : getValidCols(b)[0];
  };

  const startGame = () => {
    setBoard(emptyBoard());
    setTurn(HUMAN);
    setPhase("playing");
    setWinner(null);
    setWinCells([]);
    setHoverCol(null);
  };

  const handleColClick = (col: number) => {
    if (phase !== "playing" || turn !== HUMAN) return;
    const next = dropDisc(board, col, HUMAN);
    if (!next) return;

    playSound("click");
    const result = checkWinner(next);
    if (result) {
      setBoard(next);
      setWinCells(result.cells);
      setWinner(HUMAN);
      setPhase("won");
      setScores((s) => ({ ...s, human: s.human + 1 }));
      playChord(["success", "win"]);
      return;
    }
    if (isDraw(next)) {
      setBoard(next);
      setPhase("draw");
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      playSound("fail");
      return;
    }
    setBoard(next);
    setTurn(AI);
  };

  // AI turn
  useEffect(() => {
    if (phase !== "playing" || turn !== AI) return;
    const timer = setTimeout(() => {
      const col = getAIMove(board);
      const next = dropDisc(board, col, AI);
      if (!next) return;
      playSound("click");

      const result = checkWinner(next);
      if (result) {
        setBoard(next);
        setWinCells(result.cells);
        setWinner(AI);
        setPhase("won");
        setScores((s) => ({ ...s, ai: s.ai + 1 }));
        playSound("lose");
        return;
      }
      if (isDraw(next)) {
        setBoard(next);
        setPhase("draw");
        setScores((s) => ({ ...s, draws: s.draws + 1 }));
        playSound("fail");
        return;
      }
      setBoard(next);
      setTurn(HUMAN);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase]);

  const tool = toolBySlug("connect-four", tools);

  const discClass = (cell: Cell, isWin: boolean) =>
    cn(
      "w-full aspect-square rounded-full transition-all",
      cell === EMPTY && "bg-background/60 shadow-inner",
      cell === HUMAN && "bg-gradient-to-br from-red-400 to-red-600 shadow-md ring-1 ring-red-700/50",
      cell === AI && "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-md ring-1 ring-yellow-700/50",
      isWin && "ring-4 ring-white animate-pulse",
    );

  const statusText =
    phase === "playing"
      ? turn === HUMAN
        ? "Your turn"
        : "AI thinking..."
      : phase === "draw"
        ? "Draw!"
        : winner === HUMAN
          ? "You win!"
          : "AI wins!";

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        {phase === "idle" ? (
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="text-6xl">🔴🟡</div>
            <div>
              <h2 className="font-display text-2xl font-bold">Connect Four</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Drop your red discs and connect four in a row — horizontally, vertically, or diagonally — before the AI
                does.
              </p>
            </div>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-sm font-bold border transition capitalize",
                    difficulty === d
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={startGame}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition"
            >
              Start Game
            </button>
          </div>
        ) : (
          <>
            {/* Status bar */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
                <span>You{scores.human > 0 && ` (${scores.human})`}</span>
              </div>
              <div className="text-sm font-bold text-muted-foreground">{statusText}</div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>AI{scores.ai > 0 && ` (${scores.ai})`}</span>
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500" />
              </div>
            </div>

            {/* Board container */}
            <div className="relative mx-auto max-w-xl">
              {/* Preview row */}
              <div className="grid gap-1.5 mb-1.5 px-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, c) => (
                  <div key={c} className="aspect-square flex items-center justify-center">
                    {hoverCol === c && turn === HUMAN && phase === "playing" && (
                      <div className="w-[80%] aspect-square rounded-full bg-gradient-to-br from-red-400 to-red-600 opacity-70" />
                    )}
                  </div>
                ))}
              </div>

              {/* Board */}
              <div
                className="rounded-2xl p-2 bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg"
                onMouseLeave={() => setHoverCol(null)}
              >
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                  {board.map((row, r) =>
                    row.map((cell, c) => {
                      const isWin = winCells.some(([wr, wc]) => wr === r && wc === c);
                      return (
                        <button
                          key={`${r}-${c}`}
                          onClick={() => handleColClick(c)}
                          onMouseEnter={() => setHoverCol(c)}
                          disabled={phase !== "playing" || turn !== HUMAN}
                          className="p-1 rounded-full bg-blue-950/40 hover:bg-blue-950/60 transition disabled:cursor-not-allowed"
                          aria-label={`Column ${c + 1}, row ${r + 1}`}
                        >
                          <div className={discClass(cell, isWin)} />
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    startGame();
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-sm font-bold border transition capitalize",
                    difficulty === d
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {d}
                </button>
              ))}
              <button
                onClick={startGame}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition"
              >
                New Game
              </button>
            </div>

            {/* Win / Draw overlay */}
            {(phase === "won" || phase === "draw") && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                  <div className="text-6xl mb-2">{phase === "draw" ? "🤝" : winner === HUMAN ? "🎉" : "😔"}</div>
                  <h3 className="font-display text-2xl font-bold mb-2">
                    {phase === "draw" ? "It's a Draw!" : winner === HUMAN ? "You Win!" : "AI Wins!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    You: {scores.human} · AI: {scores.ai} · Draws: {scores.draws}
                  </p>
                  <button
                    onClick={startGame}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AdZone id="connect-four-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Click any column to drop your red disc — try to connect four in a row.",
          "Connect four horizontally, vertically, or diagonally to win.",
          "Block the AI's moves while building your own line — choose your difficulty wisely!",
        ]}
      />

      <ToolSeoContent
        title="Free Connect Four Game Online — Drop Discs & Connect 4 in a Row"
        description="Play Connect Four free online against an AI or a friend. Drop discs into the grid to connect four of your color in a row. Free, no signup required."
        body={[
          "Skycally's Connect Four challenges you to be the first to connect four discs of your color in a row — horizontally, vertically, or diagonally. Click any column to drop your disc into the lowest available position. The AI responds instantly, or play against a friend on the same device in two-player mode.",
          "Connect Four was invented by Howard Wexler and Ned Scheider and released by Milton Bradley in 1974. It was mathematically solved in 1988 by James Dow Allen and Victor Allis — with perfect play, the first player always wins. This makes it a fascinating example of combinatorial game theory where the outcome is theoretically determined, yet the game remains strategically rich and engaging.",
          "Three difficulty levels are available. Easy plays randomly with occasional blocking moves. Medium checks for immediate threats. Hard uses a deeper minimax search and is a genuine challenge for experienced players. The game's 6×7 grid creates over 4 trillion possible positions — far more complex than Tic Tac Toe despite its simple appearance.",
          "Winning at Connect Four requires thinking several moves ahead. Key strategies include building diagonal threats, creating two simultaneous threats your opponent cannot block in one move (a fork), and controlling the center column — which is involved in more winning combinations than any other column on the board.",
        ]}
        faqs={[
          {
            question: "How do I play Connect Four?",
            answer:
              "Click a column to drop your disc into it. Discs fall to the lowest available row. Connect four discs of your color in a row — horizontally, vertically, or diagonally — to win.",
          },
          {
            question: "Can I play against a friend?",
            answer: "Yes. Select 2 Player mode and take turns dropping discs on the same device.",
          },
          {
            question: "How many difficulty levels are there?",
            answer:
              "Three: Easy (mostly random), Medium (blocks immediate threats), and Hard (deep minimax search — a serious challenge).",
          },
          {
            question: "Who goes first?",
            answer:
              "Red always goes first. With perfect play, the first player has a forced win — but Hard AI makes it difficult to execute.",
          },
          {
            question: "What is a Connect Four fork?",
            answer:
              "A fork is a position where you threaten to connect four in two different directions simultaneously — your opponent can only block one, guaranteeing you win on the next move.",
          },
          {
            question: "Why should I control the center column?",
            answer:
              "The center column is part of more potential winning combinations than any other column, making it strategically the most valuable position on the board.",
          },
          {
            question: "Is Connect Four a solved game?",
            answer:
              "Yes. Mathematically, with perfect play, the first player always wins. However, this requires very precise play that is difficult to execute in practice.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. Tap any column to drop your disc. The board is fully responsive and touch-friendly.",
          },
        ]}
      />

      <RelatedTools currentSlug="connect-four" />
    </ToolPageShell>
  );
}
