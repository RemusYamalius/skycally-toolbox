import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { playSound, playChord } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/chess")({
  head: () => buildToolMeta(toolBySlug("chess", tools)),
  component: ChessPage,
});

// ============ Types ============
type Color = "w" | "b";
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];

interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  promotion?: PieceType;
}

interface GameState {
  board: Board;
  turn: Color;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: [number, number] | null;
  halfMove: number;
  fullMove: number;
}

const SYMBOLS: Record<Color, Record<PieceType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

const INIT_BOARD = (): Board => {
  const b: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  const backRank: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  backRank.forEach((t, c) => {
    b[0][c] = { type: t, color: "b" };
    b[7][c] = { type: t, color: "w" };
  });
  for (let c = 0; c < 8; c++) {
    b[1][c] = { type: "P", color: "b" };
    b[6][c] = { type: "P", color: "w" };
  }
  return b;
};

const INIT_STATE = (): GameState => ({
  board: INIT_BOARD(),
  turn: "w",
  castling: { wK: true, wQ: true, bK: true, bQ: true },
  enPassant: null,
  halfMove: 0,
  fullMove: 1,
});

const cloneBoard = (b: Board): Board => b.map((row) => row.slice());

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

// ============ Move generation ============
const SLIDES: Record<"R" | "B" | "Q", [number, number][]> = {
  R: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  B: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  Q: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

const KNIGHT_OFFSETS: [number, number][] = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

const KING_OFFSETS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const getPieceMoves = (state: GameState, r: number, c: number): Move[] => {
  const piece = state.board[r][c];
  if (!piece) return [];
  const moves: Move[] = [];
  const { board } = state;
  const color = piece.color;
  const enemy: Color = color === "w" ? "b" : "w";

  const push = (toR: number, toC: number) => {
    moves.push({ fromR: r, fromC: c, toR, toC });
  };

  if (piece.type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promoRow = color === "w" ? 0 : 7;
    // forward 1
    const f1r = r + dir;
    if (inBounds(f1r, c) && !board[f1r][c]) {
      if (f1r === promoRow) {
        (["Q", "R", "B", "N"] as PieceType[]).forEach((p) =>
          moves.push({ fromR: r, fromC: c, toR: f1r, toC: c, promotion: p }),
        );
      } else {
        push(f1r, c);
        // forward 2
        if (r === startRow && !board[r + 2 * dir][c]) {
          push(r + 2 * dir, c);
        }
      }
    }
    // captures
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color === enemy) {
        if (tr === promoRow) {
          (["Q", "R", "B", "N"] as PieceType[]).forEach((p) =>
            moves.push({ fromR: r, fromC: c, toR: tr, toC: tc, promotion: p }),
          );
        } else {
          push(tr, tc);
        }
      }
      // en passant
      if (
        state.enPassant &&
        state.enPassant[0] === tr &&
        state.enPassant[1] === tc &&
        !target
      ) {
        push(tr, tc);
      }
    }
    return moves;
  }

  if (piece.type === "N") {
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const tr = r + dr;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const t = board[tr][tc];
      if (!t || t.color === enemy) push(tr, tc);
    }
    return moves;
  }

  if (piece.type === "K") {
    for (const [dr, dc] of KING_OFFSETS) {
      const tr = r + dr;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const t = board[tr][tc];
      if (!t || t.color === enemy) push(tr, tc);
    }
    // castling
    const row = color === "w" ? 7 : 0;
    if (r === row && c === 4) {
      const rights = state.castling;
      const canK = color === "w" ? rights.wK : rights.bK;
      const canQ = color === "w" ? rights.wQ : rights.bQ;
      if (canK && !board[row][5] && !board[row][6]) {
        const rook = board[row][7];
        if (
          rook &&
          rook.type === "R" &&
          rook.color === color &&
          !isSquareAttacked(state, row, 4, enemy) &&
          !isSquareAttacked(state, row, 5, enemy) &&
          !isSquareAttacked(state, row, 6, enemy)
        ) {
          push(row, 6);
        }
      }
      if (canQ && !board[row][1] && !board[row][2] && !board[row][3]) {
        const rook = board[row][0];
        if (
          rook &&
          rook.type === "R" &&
          rook.color === color &&
          !isSquareAttacked(state, row, 4, enemy) &&
          !isSquareAttacked(state, row, 3, enemy) &&
          !isSquareAttacked(state, row, 2, enemy)
        ) {
          push(row, 2);
        }
      }
    }
    return moves;
  }

  // sliding
  const dirs =
    piece.type === "R" ? SLIDES.R : piece.type === "B" ? SLIDES.B : SLIDES.Q;
  for (const [dr, dc] of dirs) {
    let tr = r + dr;
    let tc = c + dc;
    while (inBounds(tr, tc)) {
      const t = board[tr][tc];
      if (!t) {
        push(tr, tc);
      } else {
        if (t.color === enemy) push(tr, tc);
        break;
      }
      tr += dr;
      tc += dc;
    }
  }
  return moves;
};

const isSquareAttacked = (
  state: GameState,
  r: number,
  c: number,
  by: Color,
): boolean => {
  const board = state.board;
  // pawn attacks
  const pdir = by === "w" ? 1 : -1; // attacking pawn comes from below if by white pieces? white pawns attack upward (dir=-1), so square r,c attacked by white pawn at r+1, c±1
  // Re-derive: white pawn at (pr,pc) attacks (pr-1, pc±1). So (r,c) attacked by white if there is a white pawn at (r+1, c±1).
  const pr = by === "w" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inBounds(pr, c + dc)) {
      const p = board[pr][c + dc];
      if (p && p.color === by && p.type === "P") return true;
    }
  }
  void pdir;
  // knights
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const tr = r + dr;
    const tc = c + dc;
    if (!inBounds(tr, tc)) continue;
    const p = board[tr][tc];
    if (p && p.color === by && p.type === "N") return true;
  }
  // king
  for (const [dr, dc] of KING_OFFSETS) {
    const tr = r + dr;
    const tc = c + dc;
    if (!inBounds(tr, tc)) continue;
    const p = board[tr][tc];
    if (p && p.color === by && p.type === "K") return true;
  }
  // sliding (rook/queen orthogonals)
  for (const [dr, dc] of SLIDES.R) {
    let tr = r + dr;
    let tc = c + dc;
    while (inBounds(tr, tc)) {
      const p = board[tr][tc];
      if (p) {
        if (p.color === by && (p.type === "R" || p.type === "Q")) return true;
        break;
      }
      tr += dr;
      tc += dc;
    }
  }
  // sliding (bishop/queen diagonals)
  for (const [dr, dc] of SLIDES.B) {
    let tr = r + dr;
    let tc = c + dc;
    while (inBounds(tr, tc)) {
      const p = board[tr][tc];
      if (p) {
        if (p.color === by && (p.type === "B" || p.type === "Q")) return true;
        break;
      }
      tr += dr;
      tc += dc;
    }
  }
  return false;
};

const findKing = (board: Board, color: Color): [number, number] | null => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "K" && p.color === color) return [r, c];
    }
  }
  return null;
};

const isInCheck = (state: GameState, color: Color): boolean => {
  const king = findKing(state.board, color);
  if (!king) return false;
  const enemy: Color = color === "w" ? "b" : "w";
  return isSquareAttacked(state, king[0], king[1], enemy);
};

const applyMove = (state: GameState, move: Move): GameState => {
  const board = cloneBoard(state.board);
  const piece = board[move.fromR][move.fromC];
  if (!piece) return state;
  const captured = board[move.toR][move.toC];
  const color = piece.color;
  const enemy: Color = color === "w" ? "b" : "w";

  const castling = { ...state.castling };
  let enPassant: [number, number] | null = null;
  let halfMove = state.halfMove + 1;

  // En passant capture
  if (
    piece.type === "P" &&
    state.enPassant &&
    move.toR === state.enPassant[0] &&
    move.toC === state.enPassant[1] &&
    !captured
  ) {
    board[move.fromR][move.toC] = null;
    halfMove = 0;
  }

  if (captured) halfMove = 0;
  if (piece.type === "P") halfMove = 0;

  // Move piece
  board[move.toR][move.toC] = piece;
  board[move.fromR][move.fromC] = null;

  // Pawn double-step → set en passant target
  if (piece.type === "P" && Math.abs(move.toR - move.fromR) === 2) {
    enPassant = [(move.fromR + move.toR) / 2, move.fromC];
  }

  // Promotion
  if (piece.type === "P" && (move.toR === 0 || move.toR === 7)) {
    board[move.toR][move.toC] = {
      type: move.promotion ?? "Q",
      color,
    };
  }

  // Castling rook move
  if (piece.type === "K" && Math.abs(move.toC - move.fromC) === 2) {
    const row = move.fromR;
    if (move.toC === 6) {
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else if (move.toC === 2) {
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
  }

  // Update castling rights
  if (piece.type === "K") {
    if (color === "w") {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  if (piece.type === "R") {
    if (color === "w" && move.fromR === 7) {
      if (move.fromC === 0) castling.wQ = false;
      if (move.fromC === 7) castling.wK = false;
    } else if (color === "b" && move.fromR === 0) {
      if (move.fromC === 0) castling.bQ = false;
      if (move.fromC === 7) castling.bK = false;
    }
  }
  // Rook captured
  if (move.toR === 7 && move.toC === 0) castling.wQ = false;
  if (move.toR === 7 && move.toC === 7) castling.wK = false;
  if (move.toR === 0 && move.toC === 0) castling.bQ = false;
  if (move.toR === 0 && move.toC === 7) castling.bK = false;

  return {
    board,
    turn: enemy,
    castling,
    enPassant,
    halfMove,
    fullMove: state.fullMove + (color === "b" ? 1 : 0),
  };
};

const getLegalMoves = (state: GameState): Move[] => {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p || p.color !== state.turn) continue;
      const pm = getPieceMoves(state, r, c);
      for (const m of pm) {
        const next = applyMove(state, m);
        if (!isInCheck(next, state.turn)) moves.push(m);
      }
    }
  }
  return moves;
};

// ============ AI ============
const PIECE_VALUE: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

const PST: Record<PieceType, number[][]> = {
  P: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  N: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  B: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  R: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  Q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  K: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

const evaluate = (state: GameState): number => {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const pstR = p.color === "w" ? r : 7 - r;
      const val = PIECE_VALUE[p.type] + PST[p.type][pstR][c];
      score += p.color === "w" ? val : -val;
    }
  }
  return score;
};

const minimax = (
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number => {
  if (depth === 0) return evaluate(state);
  const moves = getLegalMoves(state);
  if (moves.length === 0) {
    if (isInCheck(state, state.turn)) {
      return maximizing ? -100000 - depth : 100000 + depth;
    }
    return 0;
  }

  if (maximizing) {
    let max = -Infinity;
    for (const move of moves) {
      const val = minimax(
        applyMove(state, move),
        depth - 1,
        alpha,
        beta,
        false,
      );
      if (val > max) max = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return max;
  } else {
    let min = Infinity;
    for (const move of moves) {
      const val = minimax(
        applyMove(state, move),
        depth - 1,
        alpha,
        beta,
        true,
      );
      if (val < min) min = val;
      if (val < beta) beta = val;
      if (beta <= alpha) break;
    }
    return min;
  }
};

const getBestMove = (state: GameState): Move | null => {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  // shuffle for variety
  const shuffled = moves
    .map((m) => ({ m, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.m);
  let bestMove = shuffled[0];
  let bestVal = Infinity;
  for (const move of shuffled) {
    const val = minimax(applyMove(state, move), 2, -Infinity, Infinity, true);
    if (val < bestVal) {
      bestVal = val;
      bestMove = move;
    }
  }
  return bestMove;
};

// ============ Component ============
function ChessPage() {
  const [gameState, setGameState] = useState<GameState>(INIT_STATE());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle");
  const [result, setResult] = useState<"w" | "b" | "draw" | null>(null);
  const [aiThinkingState, setAiThinking] = useState(false);
  const [promotionPending, setPromotionPending] = useState<Move | null>(null);
  const [capturedW, setCapturedW] = useState<PieceType[]>([]);
  const [capturedB, setCapturedB] = useState<PieceType[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const aiThinking = useRef(false);

  const allLegalForTurn = useMemo(
    () => (phase === "playing" ? getLegalMoves(gameState) : []),
    [gameState, phase],
  );

  const resetAll = () => {
    setGameState(INIT_STATE());
    setSelected(null);
    setLegalMoves([]);
    setResult(null);
    setCapturedW([]);
    setCapturedB([]);
    setLastMove(null);
    setPromotionPending(null);
  };

  const checkGameOver = (state: GameState) => {
    const moves = getLegalMoves(state);
    if (moves.length === 0) {
      if (isInCheck(state, state.turn)) {
        const winner = state.turn === "w" ? "b" : "w";
        setResult(winner);
        if (winner === "w") playChord(["win", "success"]);
        else playSound("lose");
      } else {
        setResult("draw");
        playSound("fail");
      }
      setPhase("ended");
      return true;
    }
    if (state.halfMove >= 100) {
      setResult("draw");
      playSound("fail");
      setPhase("ended");
      return true;
    }
    return false;
  };

  const playMoveSound = (state: GameState, move: Move, wasCapture: boolean, opponent: Color) => {
    const piece = state.board[move.fromR][move.fromC];
    const isCastle = piece?.type === "K" && Math.abs(move.toC - move.fromC) === 2;
    if (isCastle) playSound("castle");
    else if (wasCapture) playSound("capture");
    else playSound("move");
    // check sound shortly after
    const next = applyMove(state, move);
    if (isInCheck(next, opponent)) setTimeout(() => playSound("check"), 120);
  };

  const doMove = (move: Move) => {
    const captured = gameState.board[move.toR][move.toC];
    // en passant captured pawn check
    const piece = gameState.board[move.fromR][move.fromC];
    if (
      piece?.type === "P" &&
      gameState.enPassant &&
      move.toR === gameState.enPassant[0] &&
      move.toC === gameState.enPassant[1] &&
      !captured
    ) {
      const epPawn = gameState.board[move.fromR][move.toC];
      if (epPawn) {
        if (epPawn.color === "w") setCapturedW((prev) => [...prev, epPawn.type]);
        else setCapturedB((prev) => [...prev, epPawn.type]);
      }
    } else if (captured) {
      if (captured.color === "w")
        setCapturedW((prev) => [...prev, captured.type]);
      else setCapturedB((prev) => [...prev, captured.type]);
    }
    const newState = applyMove(gameState, move);
    setGameState(newState);
    setLastMove(move);
    setSelected(null);
    setLegalMoves([]);
    checkGameOver(newState);
  };

  // AI move effect
  useEffect(() => {
    if (gameState.turn !== "b" || phase !== "playing" || aiThinking.current)
      return;
    aiThinking.current = true;
    setAiThinking(true);
    const t = setTimeout(() => {
      const move = getBestMove(gameState);
      if (move) {
        const captured = gameState.board[move.toR][move.toC];
        const piece = gameState.board[move.fromR][move.fromC];
        if (
          piece?.type === "P" &&
          gameState.enPassant &&
          move.toR === gameState.enPassant[0] &&
          move.toC === gameState.enPassant[1] &&
          !captured
        ) {
          const epPawn = gameState.board[move.fromR][move.toC];
          if (epPawn) {
            if (epPawn.color === "w")
              setCapturedW((prev) => [...prev, epPawn.type]);
            else setCapturedB((prev) => [...prev, epPawn.type]);
          }
        } else if (captured) {
          if (captured.color === "w")
            setCapturedW((prev) => [...prev, captured.type]);
          else setCapturedB((prev) => [...prev, captured.type]);
        }
        const newState = applyMove(gameState, move);
        setGameState(newState);
        setLastMove(move);
        checkGameOver(newState);
      }
      aiThinking.current = false;
      setAiThinking(false);
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, phase]);

  const handleCellClick = (r: number, c: number) => {
    if (phase !== "playing" || gameState.turn !== "w" || aiThinkingState)
      return;

    if (selected) {
      const move = legalMoves.find((m) => m.toR === r && m.toC === c);
      if (move) {
        const piece = gameState.board[selected[0]][selected[1]];
        if (piece?.type === "P" && r === 0) {
          setPromotionPending({ ...move, promotion: "Q" });
          return;
        }
        doMove(move);
        return;
      }
    }

    const piece = gameState.board[r][c];
    if (piece && piece.color === "w") {
      setSelected([r, c]);
      setLegalMoves(
        allLegalForTurn.filter((m) => m.fromR === r && m.fromC === c),
      );
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const isLight = (r: number, c: number) => (r + c) % 2 === 0;
  const isSelected = (r: number, c: number) =>
    selected?.[0] === r && selected?.[1] === c;
  const isLegalTarget = (r: number, c: number) =>
    legalMoves.some((m) => m.toR === r && m.toC === c);
  const isLastMoveSq = (r: number, c: number) =>
    !!lastMove &&
    ((lastMove.fromR === r && lastMove.fromC === c) ||
      (lastMove.toR === r && lastMove.toC === c));

  const inCheckNow = phase === "playing" && isInCheck(gameState, gameState.turn);
  const kingPos = inCheckNow ? findKing(gameState.board, gameState.turn) : null;

  return (
    <ToolPageShell
      title="Chess"
      description="Play chess against a smart AI opponent. Classic strategy game with full rules support!"
    >
      <div className="flex flex-col items-center gap-3">
        {/* Status bar */}
        <div className="flex justify-between items-center w-full max-w-[480px] mx-auto mb-1 text-sm gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg shrink-0">♟</span>
            <span className="text-muted-foreground text-xs truncate">
              {capturedW.map((t) => SYMBOLS.b[t]).join("")}
            </span>
          </div>
          <span
            className={cn(
              "font-bold px-3 py-1 rounded-full text-xs whitespace-nowrap",
              aiThinkingState
                ? "bg-yellow-500/20 text-yellow-500"
                : phase === "ended"
                  ? "bg-muted text-muted-foreground"
                  : gameState.turn === "w"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
            )}
          >
            {phase === "idle"
              ? "Ready to play"
              : aiThinkingState
                ? "AI thinking..."
                : phase === "ended"
                  ? result === "draw"
                    ? "Draw!"
                    : result === "w"
                      ? "You win! 🎉"
                      : "AI wins!"
                  : gameState.turn === "w"
                    ? "Your turn"
                    : "AI's turn"}
          </span>
          <div className="flex items-center gap-2 flex-row-reverse min-w-0 flex-1">
            <span className="text-lg shrink-0">♙</span>
            <span className="text-muted-foreground text-xs truncate">
              {capturedB.map((t) => SYMBOLS.w[t]).join("")}
            </span>
          </div>
        </div>

        {/* Board */}
        <div className="grid grid-cols-8 border border-border rounded-xl overflow-hidden w-full max-w-[480px] mx-auto aspect-square">
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const piece = gameState.board[r][c];
              const light = isLight(r, c);
              const sel = isSelected(r, c);
              const legal = isLegalTarget(r, c);
              const last = isLastMoveSq(r, c);
              const isCheckSq =
                kingPos && kingPos[0] === r && kingPos[1] === c;

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={cn(
                    "aspect-square flex items-center justify-center relative cursor-pointer text-3xl sm:text-4xl select-none transition-colors",
                    light ? "bg-[#F0D9B5]" : "bg-[#B58863]",
                    last && "ring-2 ring-inset ring-yellow-300/70",
                    sel && "ring-4 ring-inset ring-yellow-400",
                    isCheckSq && "ring-4 ring-inset ring-red-500",
                  )}
                >
                  {legal && !piece && (
                    <div className="w-1/3 h-1/3 rounded-full bg-black/25 pointer-events-none" />
                  )}
                  {legal && piece && (
                    <div className="absolute inset-0 ring-4 ring-inset ring-black/35 pointer-events-none" />
                  )}
                  {piece && (
                    <span
                      className={cn(
                        "leading-none drop-shadow-md",
                        piece.color === "w"
                          ? "text-white [text-shadow:0_1px_3px_#000]"
                          : "text-gray-900 [text-shadow:0_1px_2px_rgba(255,255,255,0.4)]",
                      )}
                    >
                      {SYMBOLS[piece.color][piece.type]}
                    </span>
                  )}
                  {c === 0 && (
                    <span
                      className={cn(
                        "absolute top-0.5 left-1 text-[10px] font-bold opacity-70",
                        light ? "text-[#B58863]" : "text-[#F0D9B5]",
                      )}
                    >
                      {8 - r}
                    </span>
                  )}
                  {r === 7 && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-1 text-[10px] font-bold opacity-70",
                        light ? "text-[#B58863]" : "text-[#F0D9B5]",
                      )}
                    >
                      {String.fromCharCode(97 + c)}
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>

        <div className="flex gap-2 mt-2">
          {phase === "idle" && (
            <button
              onClick={() => {
                resetAll();
                setPhase("playing");
              }}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition"
            >
              Start Game
            </button>
          )}
          {phase !== "idle" && (
            <button
              onClick={() => {
                resetAll();
                setPhase("playing");
              }}
              className="px-5 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-secondary transition"
            >
              New Game
            </button>
          )}
        </div>
      </div>

      {/* Promotion modal */}
      {promotionPending && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 border border-border text-center">
            <p className="font-bold text-foreground mb-4">Promote pawn to:</p>
            <div className="flex gap-3 justify-center">
              {(["Q", "R", "B", "N"] as PieceType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const move = { ...promotionPending, promotion: t };
                    setPromotionPending(null);
                    doMove(move);
                  }}
                  className="text-4xl w-14 h-14 rounded-xl border border-border hover:bg-secondary transition flex items-center justify-center text-foreground"
                >
                  {SYMBOLS.w[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === "ended" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-8 text-center border border-border max-w-sm w-full">
            <p className="text-5xl mb-3">
              {result === "w" ? "🎉" : result === "draw" ? "🤝" : "😔"}
            </p>
            <p className="text-2xl font-black text-foreground mb-1">
              {result === "w"
                ? "You Win!"
                : result === "draw"
                  ? "Draw!"
                  : "AI Wins!"}
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              {result === "w"
                ? "Checkmate — well played!"
                : result === "draw"
                  ? "Stalemate or 50-move rule."
                  : "Checkmate — try again!"}
            </p>
            <button
              onClick={() => {
                resetAll();
                setPhase("playing");
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <HowToUse
        steps={[
          "Click any of your pieces (white) to see its legal moves highlighted.",
          "Click a highlighted square to move — dots show empty squares, rings show captures.",
          "Beat the AI by checkmating its king — good luck!",
        ]}
      />

      <RelatedTools currentSlug="chess" />

      <ToolSeoContent
        title="Chess — Free Online Chess Game vs AI"
        description="Play chess online for free against a smart AI. Full chess rules including castling, en passant and pawn promotion. No sign-up needed!"
        body={[
          "Chess is the timeless game of strategy where two players battle wits across a 64-square board. This free online version lets you play directly in your browser against a built-in AI opponent — no downloads, no account, no setup. Click one of your white pieces to see every legal move highlighted, then click a destination square to play it. The AI replies automatically as black, using a minimax engine with alpha-beta pruning and a positional evaluation to choose its move.",
          "All standard rules are supported: castling on both sides, en passant captures, and pawn promotion with a choice between queen, rook, bishop, or knight. The game also detects checkmate, stalemate, and the 50-move rule automatically, so you always know when a game is over. Whether you're learning the basics or sharpening your tactics, this is a clean, fast way to play a full game of chess anytime.",
        ]}
        faqs={[
          {
            question: "How strong is the AI opponent?",
            answer:
              "The AI uses a minimax search with alpha-beta pruning and a material plus piece-square evaluation. It searches a few plies deep and plays a reasonable tactical game — strong enough to punish blunders but beatable with solid positional play.",
          },
          {
            question: "How do I castle?",
            answer:
              "Click your king and then click two squares toward the rook on the side you want to castle. Castling is only offered when the king and rook have not moved, the squares between them are empty, and the king does not move through or into check.",
          },
          {
            question: "What about pawn promotion?",
            answer:
              "When one of your pawns reaches the last rank, a small modal pops up letting you choose to promote it to a queen, rook, bishop, or knight. The AI promotes automatically to a queen.",
          },
          {
            question: "How do I start a new game?",
            answer:
              "Use the New Game button below the board at any time to reset the position and start fresh. The same button appears on the game-over overlay after a win, loss, or draw.",
          },
        ]}
      />
    </ToolPageShell>
  );
}
