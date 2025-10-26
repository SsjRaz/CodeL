export function normalizeLine(s: string) {
  // Remove only trailing spaces; keep internal spaces as-is
  return s.replace(/\s+$/, "");
}

export function normalizeLines(text: string): string[] {
  const parts = text.split("\n").map(normalizeLine);

  // Trim leading/trailing blank lines to reduce “off-by-one-line” frustration
  while (parts.length && parts[0] === "") parts.shift();
  while (parts.length && parts[parts.length - 1] === "") parts.pop();

  return parts;
}
