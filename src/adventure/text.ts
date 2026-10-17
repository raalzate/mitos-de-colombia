const CHARS_PER_LINE = 58;
const LINES_PER_PAGE = 3;

/** Parte un texto en renglones que caben en la caja de diálogo, sin cortar palabras. */
export function wrap(text: string, width = CHARS_PER_LINE): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) { out.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

export function paginate(texts: string[]): string[][] {
  const pages: string[][] = [];
  for (const t of texts) {
    const lines = wrap(t.toUpperCase());
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  return pages;
}

