// src/lib/scoring.ts
import type { LineFeedback } from "../types";

/**
 * Score a guess against the target on a per-line basis:
 * - "correct": exact text at the same index
 * - "present": exact text exists elsewhere in the target (unused)
 * - "absent" : not found in target
 */
export function scoreGuess(guessLines: string[], targetLines: string[]): LineFeedback[] {
  const used = new Array(targetLines.length).fill(false);

  // 1) Mark "correct" where line matches exactly at the same index
  const out: LineFeedback[] = guessLines.map((line, i) => {
    if (i < targetLines.length && line === targetLines[i]) {
      used[i] = true;
      return { line, status: "correct" };
    }
    return { line, status: "absent" };
  });

  // 2) Second pass: mark "present" for lines that exist elsewhere (not already used)
  for (let i = 0; i < guessLines.length; i++) {
    if (out[i].status === "absent") {
      const idx = targetLines.findIndex((tl, ti) => !used[ti] && tl === guessLines[i]);
      if (idx !== -1) {
        used[idx] = true;
        out[i] = { line: guessLines[i], status: "present" };
      }
    }
  }
  return out;
}
