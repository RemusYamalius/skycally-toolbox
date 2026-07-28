import { loadScript } from "@/lib/cdnScript";
import type { CrosswordPuzzle } from "./puzzles";
import { buildGrid, cellKey } from "./grid";

const JSPDF_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 14;

type Doc = any;

function drawGrid(
  doc: Doc,
  puzzle: CrosswordPuzzle,
  originX: number,
  originY: number,
  size: number,
  withAnswers: boolean,
) {
  const grid = buildGrid(puzzle);
  doc.setLineWidth(0.25);

  for (let r = 0; r < puzzle.rows; r += 1) {
    for (let c = 0; c < puzzle.cols; c += 1) {
      const cell = grid.cells.get(cellKey(r, c));
      const x = originX + c * size;
      const y = originY + r * size;
      if (!cell) {
        doc.setFillColor(30, 30, 30);
        doc.rect(x, y, size, size, "F");
        continue;
      }
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(40, 40, 40);
      doc.rect(x, y, size, size, "FD");

      if (cell.number !== null) {
        doc.setFontSize(Math.max(4, size * 1.05));
        doc.setTextColor(70, 70, 70);
        doc.text(String(cell.number), x + 0.5, y + size * 0.32);
      }
      if (withAnswers) {
        doc.setFontSize(Math.max(7, size * 2.1));
        doc.setTextColor(15, 15, 15);
        doc.text(cell.solution, x + size / 2, y + size * 0.78, { align: "center" });
      }
    }
  }
  doc.setTextColor(0, 0, 0);
}

function drawClues(
  doc: Doc,
  puzzle: CrosswordPuzzle,
  startY: number,
): void {
  const grid = buildGrid(puzzle);
  const colW = (PAGE_W - MARGIN * 2 - 8) / 2;
  const columns: [string, { word: { number: number; clue: string } }[]][] = [
    ["ACROSS", grid.across],
    ["DOWN", grid.down],
  ];

  columns.forEach(([heading, list], i) => {
    const x = MARGIN + i * (colW + 8);
    let y = startY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(heading, x, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    for (const { word } of list) {
      const lines: string[] = doc.splitTextToSize(
        `${word.number}. ${word.clue}`,
        colW,
      );
      if (y + lines.length * 4.4 > PAGE_H - MARGIN) break;
      doc.text(lines, x, y);
      y += lines.length * 4.4 + 1.4;
    }
  });
}

function header(doc: Doc, title: string, subtitle: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, MARGIN, MARGIN + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(subtitle, MARGIN, MARGIN + 10);
  doc.setTextColor(0, 0, 0);
}

function footer(doc: Doc) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Free printable crossword from skycally.com", MARGIN, PAGE_H - 8);
  doc.setTextColor(0, 0, 0);
}

/**
 * Builds a two-page printable worksheet from real puzzle data:
 * page 1 is the blank grid plus clues, page 2 is the filled answer key.
 */
export async function exportCrosswordPdf(
  puzzle: CrosswordPuzzle,
  subtitle: string,
  filename: string,
): Promise<void> {
  await loadScript(JSPDF_CDN);
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) throw new Error("PDF library failed to load");

  const doc: Doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const maxGridW = PAGE_W - MARGIN * 2;
  const maxGridH = 120;
  const size = Math.min(maxGridW / puzzle.cols, maxGridH / puzzle.rows);
  const gridW = size * puzzle.cols;
  const originX = (PAGE_W - gridW) / 2;
  const originY = MARGIN + 18;

  header(doc, puzzle.title, subtitle);
  drawGrid(doc, puzzle, originX, originY, size, false);
  drawClues(doc, puzzle, originY + size * puzzle.rows + 12);
  footer(doc);

  doc.addPage();
  header(doc, `${puzzle.title} — Answer Key`, subtitle);
  drawGrid(doc, puzzle, originX, originY, size, true);
  footer(doc);

  doc.save(filename);
}
