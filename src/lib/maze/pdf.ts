import { loadScript } from "@/lib/cdnScript";
import { colOf, rowOf, solveMaze, type Maze } from "./generator";

const JSPDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 16;

type Doc = any;

function drawMaze(doc: Doc, maze: Maze, x0: number, y0: number, size: number) {
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.45);
  for (let r = 0; r < maze.rows; r += 1) {
    for (let c = 0; c < maze.cols; c += 1) {
      const cell = maze.cells[r * maze.cols + c];
      const x = x0 + c * size;
      const y = y0 + r * size;
      if (cell.n) doc.line(x, y, x + size, y);
      if (cell.w) doc.line(x, y, x, y + size);
      if (cell.e) doc.line(x + size, y, x + size, y + size);
      if (cell.s) doc.line(x, y + size, x + size, y + size);
    }
  }
}

function markEnds(doc: Doc, maze: Maze, x0: number, y0: number, size: number) {
  const label = (i: number, text: string) => {
    const x = x0 + colOf(maze, i) * size + size / 2;
    const y = y0 + rowOf(maze, i) * size + size / 2;
    doc.setFontSize(Math.max(5, size * 2.1));
    doc.text(text, x, y + size * 0.28, { align: "center" });
  };
  doc.setFont("helvetica", "bold");
  label(maze.start, "S");
  label(maze.end, "E");
  doc.setFont("helvetica", "normal");
}

function drawSolution(doc: Doc, maze: Maze, x0: number, y0: number, size: number) {
  const path = solveMaze(maze);
  if (path.length < 2) return;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(Math.max(0.5, size * 0.22));
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    doc.line(
      x0 + colOf(maze, a) * size + size / 2,
      y0 + rowOf(maze, a) * size + size / 2,
      x0 + colOf(maze, b) * size + size / 2,
      y0 + rowOf(maze, b) * size + size / 2,
    );
  }
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.45);
}

function header(doc: Doc, title: string, subtitle: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, MARGIN, MARGIN);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(subtitle, MARGIN, MARGIN + 6);
  doc.setTextColor(0, 0, 0);
}

function footer(doc: Doc) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Free printable maze from skycally.com — free for classroom and commercial use", MARGIN, PAGE_H - 10);
  doc.setTextColor(0, 0, 0);
}

/**
 * Two-page black-and-white A4 worksheet built from the exact maze on screen:
 * page 1 is the blank maze, page 2 is the same maze with the solution drawn.
 */
export async function exportMazePdf(
  maze: Maze,
  subtitle: string,
  filename: string,
): Promise<void> {
  await loadScript(JSPDF_CDN);
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) throw new Error("PDF library failed to load");

  const doc: Doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const maxW = PAGE_W - MARGIN * 2;
  const maxH = PAGE_H - MARGIN * 2 - 30;
  const size = Math.min(maxW / maze.cols, maxH / maze.rows);
  const x0 = (PAGE_W - size * maze.cols) / 2;
  const y0 = MARGIN + 16;

  header(doc, "Maze Puzzle", `${subtitle} — S = start, E = exit`);
  drawMaze(doc, maze, x0, y0, size);
  markEnds(doc, maze, x0, y0, size);
  footer(doc);

  doc.addPage();
  header(doc, "Maze Puzzle — Answer Key", subtitle);
  drawSolution(doc, maze, x0, y0, size);
  drawMaze(doc, maze, x0, y0, size);
  markEnds(doc, maze, x0, y0, size);
  footer(doc);

  doc.save(filename);
}
