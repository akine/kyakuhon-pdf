import type { ExtractionOptions, PageText, TextAtom } from "./types";

function horizontalPunctuation(text: string): string {
  const overrides: Record<string, string> = {
    "︙": "…",
    "︰": "‥",
    "︵": "（",
    "︶": "）",
    "︕": "！",
    "︖": "？",
    "︓": "：",
    "︔": "；",
  };
  // Normalize only presentation forms, preserving authorial full-width letters and circled numbers.
  return text.replace(
    /[\uFE10-\uFE19\uFE30-\uFE48]/gu,
    (character) => overrides[character] ?? character.normalize("NFKC"),
  );
}

function detectVertical(atoms: TextAtom[]): boolean {
  const characters = atoms.reduce((sum, a) => sum + a.text.trim().length, 0);
  if (
    atoms
      .filter((a) => a.vertical)
      .reduce((sum, a) => sum + a.text.trim().length, 0) >
    characters * 0.4
  )
    return true;
  // Some generators position horizontal glyphs individually in vertical columns.
  const singles = atoms.filter((a) => [...a.text.trim()].length === 1);
  let vertical = 0;
  let horizontal = 0;
  const buckets = new Map<string, TextAtom[]>();
  const size = Math.max(1, median(singles.map((a) => a.fontSize)));
  for (const a of singles) {
    const bx = Math.floor(a.x / size);
    const by = Math.floor(a.y / size);
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++) {
        for (const b of buckets.get(`${bx + dx},${by + dy}`) ?? []) {
          const x = Math.abs(a.x - b.x),
            y = Math.abs(a.y - b.y);
          if (x < size * 0.35 && y > size * 0.6 && y < size * 1.8) vertical++;
          if (y < size * 0.35 && x > size * 0.6 && x < size * 1.8) horizontal++;
        }
      }
    const key = `${bx},${by}`;
    buckets.set(key, [...(buckets.get(key) ?? []), a]);
  }
  return vertical >= 2 && vertical > horizontal * 1.2;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 12;
}

function joinLines(lines: string[]): string {
  let result = "";
  for (const line of lines) {
    const previous = result.split("\n").at(-1) ?? "";
    const openQuote =
      (previous.match(/[「『]/g)?.length ?? 0) >
      (previous.match(/[」』]/g)?.length ?? 0);
    const newBlock = /^[○〇◯●■□◆◇]|^.{1,16}[「『]|^\s*[（(]/u.test(line);
    result += result ? (openQuote && !newBlock ? "" : "\n") + line : line;
  }
  return result;
}

export function extractPage(
  atoms: TextAtom[],
  width: number,
  height: number,
  options: ExtractionOptions,
): Omit<PageText, "pageNumber"> {
  let content = atoms.filter(
    (a) => a.text.length && Number.isFinite(a.x) && Number.isFinite(a.y),
  );
  if (options.removePageNumbers)
    content = content.filter((a) => {
      const inMargin =
        a.y < height * 0.075 ||
        a.y > height * 0.925 ||
        a.x < width * 0.04 ||
        a.x > width * 0.96;
      return !(
        inMargin &&
        /^\s*[-–—ー−・(（]?\s*[0-9０-９]+\s*[-–—ー−・)）]?\s*$/u.test(a.text)
      );
    });
  if (options.removeRuby && content.length) {
    const bodySize = median(content.map((a) => a.fontSize));
    content = content.filter((a) => a.fontSize >= bodySize * 0.65);
  }
  const vertical =
    options.mode === "auto"
      ? detectVertical(content)
      : options.mode === "vertical";
  const mode = vertical ? "vertical" : "horizontal";
  const sorted = [...content].sort((a, b) =>
    vertical ? b.x - a.x || a.y - b.y : a.y - b.y || a.x - b.x,
  );
  const groups: { position: number; size: number; atoms: TextAtom[] }[] = [];
  for (const atom of sorted) {
    const position = vertical ? atom.x : atom.y;
    const group = groups.find(
      (g) =>
        Math.abs(g.position - position) <=
        Math.min(g.size, atom.fontSize) * 0.55,
    );
    if (group) group.atoms.push(atom);
    else groups.push({ position, size: atom.fontSize, atoms: [atom] });
  }
  const lines = groups
    .map((group) => {
      group.atoms.sort((a, b) => (vertical ? a.y - b.y : a.x - b.x));
      let line = "";
      let previous: TextAtom | undefined;
      for (const atom of group.atoms) {
        const gap = previous ? atom.x - previous.x - previous.width : 0;
        const needsSpace =
          !vertical &&
          previous &&
          gap > atom.fontSize * 0.12 &&
          /[\w]$/.test(line) &&
          /^[\w]/.test(atom.text);
        line += (needsSpace ? " " : "") + horizontalPunctuation(atom.text);
        previous = atom;
      }
      return line.trim();
    })
    .filter(Boolean);
  const text = options.joinWrappedLines ? joinLines(lines) : lines.join("\n");
  return { text, mode, empty: !text.trim() };
}

export function parsePageRange(
  start: string,
  end: string,
  total: number,
): number[] {
  const first = Number(start),
    last = Number(end);
  if (
    !start.trim() ||
    !end.trim() ||
    !Number.isInteger(first) ||
    !Number.isInteger(last) ||
    first < 1 ||
    last > total ||
    first > last
  ) {
    throw new Error(
      `1〜${total}の範囲で、開始ページと終了ページを指定してください。`,
    );
  }
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function formatExport(pages: PageText[], markers: boolean): string {
  return pages
    .map((p) => `${markers ? `── ${p.pageNumber}ページ ──\n` : ""}${p.text}`)
    .join("\n\n");
}
