// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { LightAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import clsx from "classnames";
import completeCodeSnippets from "./data/complete-the-code.json";
import findBugSnippets from "./data/find-the-bug.json";
import { normalizeLines, normalizeLine } from "./lib/utils";
import { scoreGuess } from "./lib/scoring";
import type { LineFeedback } from "./types";
import Homepage from "./Homepage";

import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import py from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import ts from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";

SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("python", py);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("typescript", ts);

const MAX_TRIES = 6;

interface BugSnippet {
  id: number;
  title: string;
  language: string;
  difficulty: string;
  hint: string;
  hints?: string[];
  goal?: string;
  validFixes?: string[];
  buggyLines: string[];
  bugLineNumber: number;
  fixedLines: string[];
  explanation: string;
}

interface CompleteCodeSnippet {
  id: number;
  title: string;
  language: string;
  difficulty: string;
  hint: string;
  lines: string[];
}

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const BUG_LEVELS: BugSnippet[] = (findBugSnippets as BugSnippet[])
  .slice()
  .sort((a, b) => {
    const rankA =
      DIFFICULTY_ORDER[a.difficulty?.toLowerCase?.() as keyof typeof DIFFICULTY_ORDER] ??
      0;
    const rankB =
      DIFFICULTY_ORDER[b.difficulty?.toLowerCase?.() as keyof typeof DIFFICULTY_ORDER] ??
      0;
    if (rankA !== rankB) return rankA - rankB;
    return a.id - b.id;
  })
  .slice(0, 15);

const TOTAL_BUG_LEVELS = BUG_LEVELS.length;
const BUG_LEVEL_DISPLAY_TOTAL = Math.max(TOTAL_BUG_LEVELS, 1);

interface BugGuess {
  line: number;
  fix: string;
  lineCorrect: boolean;
  fixCorrect: boolean;
}

function normalizeForComparison(text: string): string {
  return normalizeLine(text).replace(/\s+/g, " ").trim();
}

function stripAllWhitespace(text: string): string {
  return text.replace(/\s+/g, "").trim();
}

function extractReturnExpression(lines: string[]): string | null {
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    const match = line.match(/return\s+(.+?);?$/);
    if (match) {
      return stripAllWhitespace(match[1]);
    }
  }
  return null;
}

interface VariableAssignment {
  name: string;
  expression: string;
  sanitizedLine: string;
}

function extractVariableAssignments(lines: string[]): VariableAssignment[] {
  const assignments: VariableAssignment[] = [];
  const assignmentRegex = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/;

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    const match = line.match(assignmentRegex);
    if (match) {
      assignments.push({
        name: match[1],
        expression: stripAllWhitespace(match[2]),
        sanitizedLine: stripAllWhitespace(normalizeForComparison(raw)),
      });
    }
  }

  return assignments;
}

function usePrefersDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setIsDark(event.matches);
    media.addEventListener("change", listener);
    setIsDark(media.matches);
    return () => media.removeEventListener("change", listener);
  }, []);

  return isDark;
}

function buildPalette(isDarkMode: boolean) {
  return {
    pageBackground: isDarkMode ? "#0b1120" : "#ffffff",
    textPrimary: isDarkMode ? "#e2e8f0" : "#111827",
    textMuted: isDarkMode ? "rgba(226,232,240,0.75)" : "#6b7280",
    textSecondary: isDarkMode ? "#cbd5f5" : "#374151",
    border: isDarkMode ? "rgba(148,163,184,0.4)" : "#e5e7eb",
    surface: isDarkMode ? "#111827" : "#ffffff",
    surfaceRaised: isDarkMode ? "#0f172a" : "#f8fafc",
    inputBackground: isDarkMode ? "#0f172a" : "#ffffff",
    inputText: isDarkMode ? "#e2e8f0" : "#0f172a",
    inputBorder: isDarkMode ? "rgba(148,163,184,0.6)" : "#cbd5f5",
    shadow: isDarkMode ? "0 0 0 rgb(0 0 0 / 0)" : "0 10px 20px rgba(15, 23, 42, 0.08)",
    codeBackground: isDarkMode ? "#0f172a" : "#f8fafc",
  };
}

function isFixGuessCorrect(fixGuess: string, snippet: BugSnippet): boolean {
  const guessLines = normalizeLines(fixGuess)
    .map(normalizeForComparison)
    .filter(Boolean);

  if (!guessLines.length) return false;

  const normalizedTarget = snippet.fixedLines.map(normalizeForComparison);
  const fullTarget = normalizedTarget.join(" ");
  const fullGuess = guessLines.join(" ");

  if (
    guessLines.length === normalizedTarget.length &&
    guessLines.every((line, idx) => line === normalizedTarget[idx])
  ) {
    return true;
  }

  const strippedGuessLines = guessLines.map(stripAllWhitespace);
  const strippedTargetLines = normalizedTarget.map(stripAllWhitespace);

  if (
    strippedGuessLines.length === strippedTargetLines.length &&
    strippedGuessLines.every((line, idx) => line === strippedTargetLines[idx])
  ) {
    return true;
  }

  const changedLines = snippet.fixedLines.reduce<string[]>((acc, line, idx) => {
    const fixedLine = normalizeForComparison(line);
    const buggyLine = normalizeForComparison(snippet.buggyLines[idx] ?? "");
    if (!buggyLine || buggyLine !== fixedLine) {
      acc.push(fixedLine);
    }
    return acc;
  }, []);

  if (
    changedLines.length &&
    guessLines.length === changedLines.length &&
    guessLines.every((line, idx) => line === changedLines[idx])
  ) {
    return true;
  }

  const guessMatchesChangedLine = guessLines.some((line) =>
    changedLines.includes(line)
  );
  if (guessMatchesChangedLine) {
    return true;
  }

  if (fullTarget.includes(fullGuess)) {
    return true;
  }

  const strippedFullTarget = strippedTargetLines.join("");
  const strippedFullGuess = strippedGuessLines.join("");

  if (
    strippedFullTarget === strippedFullGuess ||
    strippedFullTarget.includes(strippedFullGuess) ||
    strippedFullGuess.includes(strippedFullTarget)
  ) {
    return true;
  }

  if (guessLines.length === 1 && fullTarget.includes(guessLines[0])) {
    return true;
  }

  if (snippet.validFixes?.length) {
    const sanitizedValidFixes = snippet.validFixes.map((fix) =>
      stripAllWhitespace(normalizeForComparison(fix))
    );
    if (
      strippedGuessLines.some((line) => sanitizedValidFixes.includes(line)) ||
      sanitizedValidFixes.includes(strippedFullGuess)
    ) {
      return true;
    }
  }

  const variableReturnRegex = /^return\s+([A-Za-z_$][\w$]*)\s*;?$/;
  const targetReturnExpression = extractReturnExpression(snippet.fixedLines);
  if (targetReturnExpression) {
    const assignments = extractVariableAssignments(snippet.buggyLines).filter(
      (assignment) => assignment.expression === targetReturnExpression
    );
    if (assignments.length) {
      const acceptableNames = assignments.map((assignment) => assignment.name);
      const returnsVariable = guessLines.some((line) => {
        const match = variableReturnRegex.exec(line);
        return match ? acceptableNames.includes(match[1]) : false;
      });
      if (returnsVariable) {
        const guessIncludesAssignment = strippedGuessLines.some((line) =>
          assignments.some(
            (assignment) => assignment.sanitizedLine === line
          )
        );
        if (!guessIncludesAssignment) {
          return false;
        }
        return true;
      }
    }
  }

  const lineIndex = Math.max(0, snippet.bugLineNumber - 1);
  return (
    guessLines.length === 1 && guessLines[0] === normalizedTarget[lineIndex]
  );
}

export default function App() {
  // ALL useState hooks MUST be at the top before any conditions
  const [gameMode, setGameMode] = useState<"bug" | "complete" | null>(null);
  const [bugLevelIndex, setBugLevelIndex] = useState(0);
  const [bugLineInput, setBugLineInput] = useState("");
  const [bugFixInput, setBugFixInput] = useState("");
  const [bugGuesses, setBugGuesses] = useState<BugGuess[]>([]);
  const [bugHintLevel, setBugHintLevel] = useState(0);
  const [completeInput, setCompleteInput] = useState("");
  const [completeGuesses, setCompleteGuesses] = useState<string[]>([]);
  const [allFeedback, setAllFeedback] = useState<LineFeedback[][]>([]);
  const [showCompleteHint, setShowCompleteHint] = useState(false);

  const isDarkMode = usePrefersDarkMode();
  const palette = useMemo(() => buildPalette(isDarkMode), [isDarkMode]);

  useEffect(() => {
    document.body.style.background = palette.pageBackground;
    document.body.style.color = palette.textPrimary;
    return () => {
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, [palette.pageBackground, palette.textPrimary]);

  const baseCardStyle = useMemo(
    () => ({
      background: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: 12,
      boxShadow: palette.shadow,
    }),
    [palette.surface, palette.border, palette.shadow]
  );

  const clampedBugLevelIndex =
    TOTAL_BUG_LEVELS > 0
      ? Math.min(bugLevelIndex, TOTAL_BUG_LEVELS - 1)
      : 0;

  // Select snippet based on game mode and current level
  const bugSnippet: BugSnippet | null =
    gameMode === "bug" && TOTAL_BUG_LEVELS > 0
      ? BUG_LEVELS[clampedBugLevelIndex]
      : null;

  useEffect(() => {
    if (gameMode === "bug" && bugSnippet) {
      setBugFixInput(bugSnippet.buggyLines.join("\n"));
    }
  }, [gameMode, bugSnippet]);

  const target: CompleteCodeSnippet | null = gameMode === "complete"
    ? (completeCodeSnippets as CompleteCodeSnippet[])[0]
    : null;

  const isLastBugLevel =
    gameMode === "bug" && clampedBugLevelIndex === TOTAL_BUG_LEVELS - 1;

  const bugFixHighlights =
    bugSnippet
      ? bugSnippet.fixedLines.reduce<string[]>((acc, line, idx) => {
          const buggyLine = bugSnippet.buggyLines[idx];
          if (!buggyLine || normalizeLine(buggyLine) !== normalizeLine(line)) {
            const trimmed = line.trim();
            if (trimmed) {
              acc.push(trimmed);
            }
          }
          return acc;
        }, [])
      : [];

  const bugHints: string[] =
    bugSnippet
      ? (bugSnippet.hints && bugSnippet.hints.length
          ? bugSnippet.hints
          : [
              bugSnippet.hint,
              `Focus on line ${bugSnippet.bugLineNumber}.`,
              bugSnippet.explanation,
            ]
        )
          .map((hint) => hint?.trim())
          .filter((hint): hint is string => Boolean(hint))
          .slice(0, 3)
      : [];

  const displayedBugHints = bugHints.slice(0, bugHintLevel);
  const canRevealAnotherHint = bugHintLevel < bugHints.length;
  const bugGoalText = bugSnippet
    ? bugSnippet.goal ?? bugSnippet.explanation ?? bugSnippet.hint
    : "";
  const bugTriesLeft = Math.max(0, MAX_TRIES - bugGuesses.length);

  const lastFb = allFeedback.at(-1);
  const lastWasAllCorrect =
    lastFb?.every((f) => f.status === "correct") ?? false;

  const wonBugMode =
    gameMode === "bug" &&
    bugSnippet &&
    bugGuesses.some((guess) => guess.lineCorrect && guess.fixCorrect);
  const bugGameOver = bugGuesses.length >= MAX_TRIES || wonBugMode;

  // For complete mode: check if code matches
  const wonCompleteMode =
    gameMode === "complete" &&
    target &&
    lastWasAllCorrect &&
    (completeGuesses.length > 0 &&
      normalizeLines(completeGuesses[completeGuesses.length - 1]).length ===
        target!.lines.length);

  const completeGameOver =
    completeGuesses.length >= MAX_TRIES || wonCompleteMode;

  const completeTriesLeft = Math.max(0, MAX_TRIES - completeGuesses.length);
  const completeGoalText = target
    ? `Implement ${target.title} so it behaves exactly like the reference solution.`
    : "";

  // Game ends on win or after MAX_TRIES
  const gameOver =
    gameMode === "bug"
      ? bugGameOver
      : gameMode === "complete"
      ? completeGameOver
      : false;

  const won = wonBugMode || wonCompleteMode;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (gameOver) return;

    if (gameMode === "bug" && bugSnippet) {
      // Bug finding mode: validate line number
      const lineNum = parseInt(bugLineInput);
      if (
        isNaN(lineNum) ||
        lineNum < 1 ||
        lineNum > (bugSnippet?.buggyLines.length || 0)
      ) {
        return;
      }

      if (!bugFixInput.trim()) {
        return;
      }

      const guess: BugGuess = {
        line: lineNum,
        fix: bugFixInput,
        lineCorrect: lineNum === bugSnippet.bugLineNumber,
        fixCorrect: isFixGuessCorrect(bugFixInput, bugSnippet),
      };

      setBugGuesses((prev) => [...prev, guess]);
      setBugLineInput("");
    } else if (gameMode === "complete" && target) {
      // Complete the code mode: check code match
      const gLines = normalizeLines(completeInput);
      if (!gLines.length) return;

      const fb = scoreGuess(gLines, target!.lines);
      setCompleteGuesses((prev) => [...prev, completeInput]);
      setAllFeedback((prev) => [...prev, fb]);
      setCompleteInput("");
    }
  }

  function resetGame() {
    setGameMode(null);
    setBugLevelIndex(0);
    setBugLineInput("");
    setBugFixInput("");
    setBugGuesses([]);
    setBugHintLevel(0);
    setCompleteInput("");
    setCompleteGuesses([]);
    setAllFeedback([]);
    setShowCompleteHint(false);
  }

  function retryBugMode() {
    setBugLineInput("");
    setBugFixInput("");
    setBugGuesses([]);
    setBugHintLevel(0);
  }

  function advanceBugLevel() {
    if (isLastBugLevel) {
      return;
    }
    setBugLevelIndex((prev) =>
      Math.min(prev + 1, Math.max(TOTAL_BUG_LEVELS - 1, 0))
    );
    setBugLineInput("");
    setBugFixInput("");
    setBugGuesses([]);
    setBugHintLevel(0);
  }

  // Show homepage if no mode selected - AFTER all hooks
  if (!gameMode) {
    return <Homepage onSelectMode={setGameMode} />;
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "32px auto",
        padding: "0 16px",
        color: palette.textPrimary,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>
          CodeL — {gameMode === "bug" ? "Find the Bug 🐛" : "Complete the Code ✨"}
        </h1>
        <button
          onClick={resetGame}
          style={{
            background: "transparent",
            border: `1px solid ${palette.border}`,
            borderRadius: 4,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: palette.textPrimary,
          }}
        >
          ← Back to Home
        </button>
      </div>
      
      {gameMode === "bug" && bugSnippet ? (
        <>
          <div
            style={{
              ...baseCardStyle,
              padding: 20,
              display: "grid",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                color: palette.textSecondary,
                fontWeight: 600,
              }}
            >
              <span>
                Level {Math.min(clampedBugLevelIndex + 1, BUG_LEVEL_DISPLAY_TOTAL)} of {BUG_LEVEL_DISPLAY_TOTAL}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Difficulty: {bugSnippet.difficulty}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{bugSnippet.title}</h2>
            {bugGoalText && (
              <p style={{ margin: 0, color: palette.textSecondary, lineHeight: 1.6 }}>
                {bugGoalText}
              </p>
            )}
            <p style={{ color: palette.textMuted, margin: 0 }}>
              Find the buggy line in <strong>{MAX_TRIES}</strong> tries. Identify which line contains the bug and fix it directly below.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 24,
              marginTop: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              alignItems: "start",
            }}
          >
            <div
              style={{
                ...baseCardStyle,
                padding: 20,
                display: "grid",
                gap: 16,
              }}
            >
              <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontWeight: 600 }}>
                    Type the line number with the bug (1-{bugSnippet.buggyLines.length})
                  </label>
                    <input
                      type="number"
                      min="1"
                      max={bugSnippet.buggyLines.length}
                      value={bugLineInput}
                      onChange={(e) => setBugLineInput(e.target!.value)}
                      placeholder="e.g., 3"
                      disabled={gameOver}
                      style={{
                        width: "100%",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 14,
                        padding: 12,
                        borderRadius: 8,
                        border: `1px solid ${palette.inputBorder}`,
                        outline: "none",
                        background: palette.inputBackground,
                        color: palette.inputText,
                        boxShadow: isDarkMode
                          ? "inset 0 0 0 1px rgba(148,163,184,0.15)"
                          : "inset 0 0 0 1px rgba(15, 23, 42, 0.04)",
                      }}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    maxHeight: 400,
                    background: isDarkMode ? "rgba(15,23,42,0.6)" : palette.codeBackground,
                    borderRadius: 8,
                    border: `1px solid ${palette.border}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 10px",
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: palette.textMuted,
                      borderRight: `1px solid ${palette.border}`,
                      background: isDarkMode ? "rgba(30,41,59,0.85)" : "rgba(148,163,184,0.15)",
                    }}
                  >
                    {bugSnippet.buggyLines.map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={bugFixInput}
                    onChange={(e) => setBugFixInput(e.target!.value)}
                    disabled={gameOver}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: palette.textPrimary,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 14,
                      padding: 12,
                      resize: "vertical",
                      minHeight: 160,
                      lineHeight: 1.5,
                      whiteSpace: "pre",
                      overflow: "auto",
                    }}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    wrap="off"
                  />
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={
                      gameOver ||
                      !bugLineInput.trim().length ||
                      !bugFixInput.trim().length
                    }
                      style={{
                        background:
                          gameOver ||
                          !bugLineInput.trim().length ||
                          !bugFixInput.trim().length
                            ? "#9ca3af"
                            : "#111827",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: 0,
                        cursor:
                          gameOver ||
                          !bugLineInput.trim().length ||
                          !bugFixInput.trim().length
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Submit guess
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBugHintLevel((prev) =>
                          canRevealAnotherHint ? prev + 1 : prev
                        )
                      }
                      style={{
                        background: "transparent",
                        border: `1px solid ${
                          canRevealAnotherHint ? "#eab308" : palette.border
                        }`,
                        color: canRevealAnotherHint ? "#eab308" : palette.textMuted,
                        padding: "8px 14px",
                        borderRadius: 8,
                        cursor: canRevealAnotherHint ? "pointer" : "not-allowed",
                        fontWeight: 600,
                      }}
                      disabled={!canRevealAnotherHint}
                    >
                      {bugHints.length === 0
                        ? "No hints available"
                        : canRevealAnotherHint
                        ? `Reveal Hint ${bugHintLevel + 1}`
                        : "All hints shown"}
                    </button>
                    {bugHintLevel > 0 && (
                      <button
                        type="button"
                        onClick={() => setBugHintLevel(0)}
                        style={{
                          background: "transparent",
                          border: `1px solid ${palette.border}`,
                          color: palette.textPrimary,
                          padding: "8px 14px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                      Hide hints
                    </button>
                  )}
                </div>
              </form>

              {displayedBugHints.length > 0 && (
                  <div
                    style={{
                      padding: 12,
                      background: isDarkMode ? "rgba(234,179,8,0.18)" : "rgba(234,179,8,0.08)",
                      border: "1px solid #eab308",
                      borderRadius: 10,
                      color: isDarkMode ? "#fde68a" : "#854d0e",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {displayedBugHints.map((hint, idx) => (
                      <div key={idx}>
                        <strong>Hint {idx + 1}:</strong> {hint}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div
              style={{
                ...baseCardStyle,
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Attempts & feedback</div>
                <div style={{ fontSize: 13, color: palette.textMuted }}>
                  Tries left: {bugTriesLeft}
                </div>
              </div>
              {bugGameOver && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: wonBugMode ? "#15803d" : "#b91c1c",
                  }}
                >
                  {wonBugMode ? "Challenge solved!" : "No more attempts left."}
                </div>
              )}
              {bugGuesses.length === 0 ? (
                <p style={{ color: palette.textMuted, margin: 0 }}>
                  Submit your first combination to see feedback here.
                </p>
              ) : (
                bugGuesses.map((guess, gi) => {
                  const { lineCorrect, fixCorrect } = guess;
                  const guessResult =
                    lineCorrect && fixCorrect
                      ? {
                          borderColor: "#22c55e",
                          background: "rgba(34,197,94,0.12)",
                          textColor: "#166534",
                          label: "✓ Line and fix look good!",
                        }
                      : {
                          borderColor: "#ef4444",
                          background: "rgba(239,68,68,0.12)",
                          textColor: "#991b1b",
                          label: "✗ Keep iterating",
                        };
                  return (
                    <div key={gi} style={{ display: "grid", gap: 8 }}>
                      <div
                        style={{
                          fontSize: 14,
                          padding: "10px 12px",
                          borderRadius: 6,
                          border: "2px solid",
                          borderColor: guessResult.borderColor,
                          background: guessResult.background,
                          color: guessResult.textColor,
                          fontWeight: 600,
                        }}
                      >
                        Guess #{gi + 1}: {guessResult.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: palette.textSecondary,
                          border: `1px solid ${palette.border}`,
                          borderRadius: 6,
                          padding: "8px 10px",
                          background: palette.surface,
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <strong>Line {guess.line}:</strong>{" "}
                          {lineCorrect ? "Correct line" : "Not the bug yet"}
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <strong>Fix:</strong>{" "}
                          {fixCorrect ? "Matches the fix" : "Needs adjustment"}
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 13,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {guess.fix}
                        </pre>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {gameOver && (
            <div
              style={{
                marginTop: 24,
                display: "grid",
                gap: 24,
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                alignItems: "start",
              }}
            >
              <div
                style={{
                  ...baseCardStyle,
                  padding: 20,
                  background: won
                    ? isDarkMode
                      ? "rgba(34,197,94,0.18)"
                      : "rgba(34,197,94,0.08)"
                    : isDarkMode
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(239,68,68,0.08)",
                  border: `1px solid ${won ? "#22c55e" : "#fca5a5"}`,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: won ? "#047857" : "#b91c1c",
                  }}
                >
                  {won ? "🎉 Nicely done!" : "❌ Out of tries"}
                </div>
                <div style={{ marginTop: 12, fontSize: 14, color: palette.textSecondary }}>
                  <strong>Bug location:</strong> Line {bugSnippet.bugLineNumber}
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: palette.textSecondary }}>
                  <strong>Explanation:</strong> {bugSnippet.explanation}
                </div>
                {!!bugFixHighlights.length && (
                  <div style={{ marginTop: 12, fontSize: 14, color: palette.textSecondary }}>
                    <strong>Key fixes:</strong>
                    <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                      {bugFixHighlights.map((line, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <code
                            style={{
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              background: isDarkMode ? "rgba(30,41,59,0.85)" : "#f3f4f6",
                              padding: "2px 4px",
                              borderRadius: 4,
                            }}
                          >
                            {line}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={retryBugMode}
                    style={{
                      background: "#111827",
                      color: "#ffffff",
                      padding: "10px 18px",
                      borderRadius: 8,
                      border: 0,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ↺ Retry level
                  </button>
                  {won && !isLastBugLevel && (
                    <button
                      type="button"
                      onClick={advanceBugLevel}
                      style={{
                        background: "#22c55e",
                        color: "#ffffff",
                        padding: "10px 18px",
                        borderRadius: 8,
                        border: 0,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      → Next level
                    </button>
                  )}
                  {won && isLastBugLevel && (
                    <span style={{ color: "#047857", fontWeight: 600 }}>
                      All {TOTAL_BUG_LEVELS} levels complete! 🎉
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  ...baseCardStyle,
                  padding: 16,
                  color: palette.textPrimary,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  ✅ Fixed implementation
                </div>
                <SyntaxHighlighter
                  language={bugSnippet.language}
                  wrapLongLines
                  customStyle={{
                    margin: 0,
                    fontSize: 12,
                    color: palette.textPrimary,
                    background: palette.codeBackground,
                  }}
                  codeTagProps={{
                    style: {
                      color: palette.textPrimary,
                    },
                  }}
                >
                  {bugSnippet.fixedLines.join("\n")}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
        </>
      ) : gameMode === "complete" && target ? (
        // COMPLETE THE CODE MODE
        <>
          <div
            style={{
              ...baseCardStyle,
              padding: 20,
              display: "grid",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                color: palette.textSecondary,
                fontWeight: 600,
              }}
            >
              <span>{target.language} • {target.difficulty}</span>
              <span>Level objective</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{target.title}</h2>
            {completeGoalText && (
              <p style={{ margin: 0, color: palette.textSecondary, lineHeight: 1.6 }}>
                {completeGoalText}
              </p>
            )}
            <p style={{ color: palette.textMuted, margin: 0 }}>
              Guess the code snippet in <strong>{MAX_TRIES}</strong> tries. Hints are per line:
              <span style={{ marginLeft: 8 }}><Badge color="#22c55e" label="correct" /></span>{" "}
              <Badge color="#eab308" label="present" />{" "}
              <Badge color={palette.textMuted} label="absent" />.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  ...baseCardStyle,
                  padding: 20,
                  display: "grid",
                  gap: 16,
                }}
              >
                <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontWeight: 600 }}>
                      Your guess (paste/type the function)
                    </label>
                    <textarea
                      value={completeInput}
                      onChange={(e) => setCompleteInput(e.target!.value)}
                      placeholder={`e.g.\nfunction example(input) {\n  // build and return the result\n}\n`}
                      rows={8}
                      disabled={gameOver}
                      style={{
                        width: "100%",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 14,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: `1px solid ${palette.inputBorder}`,
                        outline: "none",
                        background: palette.inputBackground,
                        color: palette.inputText,
                        boxShadow: isDarkMode
                          ? "inset 0 0 0 1px rgba(148,163,184,0.15)"
                          : "inset 0 0 0 1px rgba(15, 23, 42, 0.04)",
                        lineHeight: 1.5,
                      }}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      wrap="off"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      disabled={gameOver}
                      style={{
                        background: gameOver ? "#9ca3af" : "#111827",
                        color: "white",
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: 0,
                        cursor: gameOver ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Submit guess
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompleteHint(!showCompleteHint)}
                      style={{
                        background: "transparent",
                        border: "1px solid #eab308",
                        color: "#eab308",
                        padding: "8px 14px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {showCompleteHint ? "Hide Hint" : "Show Hint"}
                    </button>
                  </div>
                </form>

                {showCompleteHint && (
                  <div style={{ 
                    padding: 12, 
                    background: isDarkMode ? "rgba(234,179,8,0.18)" : "rgba(234,179,8,0.1)", 
                    border: "1px solid #eab308",
                    borderRadius: 8,
                    color: isDarkMode ? "#fde68a" : "#854d0e"
                  }}>
                    💡 <strong>Hint:</strong> {target!.hint}
                  </div>
                )}
              </div>

              <div
                style={{
                  ...baseCardStyle,
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Attempts & feedback</div>
                  <div style={{ fontSize: 13, color: palette.textMuted }}>
                    Tries left: {completeTriesLeft}
                  </div>
                </div>
                {completeGameOver && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: wonCompleteMode ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {wonCompleteMode ? "Challenge solved!" : "No more attempts left."}
                  </div>
                )}
                {allFeedback.length === 0 ? (
                  <p style={{ color: palette.textMuted, margin: 0 }}>
                    Each attempt will appear here with line-by-line feedback.
                  </p>
                ) : (
                  allFeedback.map((fb, gi) => (
                    <div key={gi} style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 13, color: palette.textMuted }}>
                        Guess #{gi + 1}
                      </div>
                      <CodeBoard feedback={fb} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              style={{
                ...baseCardStyle,
                padding: 16,
                position: "sticky",
                top: 24,
                color: palette.textPrimary,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{target!.title}</h3>
              <div style={{ fontSize: 12, color: palette.textMuted, marginBottom: 8 }}>
                Language: {target!.language} • Difficulty: {target!.difficulty}
              </div>
              {gameOver ? (
                <div style={{ maxHeight: 360, overflow: "auto", borderRadius: 10 }}>
                  <SyntaxHighlighter
                    language={target!.language}
                    wrapLongLines
                    customStyle={{
                      background: palette.codeBackground,
                      color: palette.textPrimary,
                    }}
                    codeTagProps={{
                      style: {
                        color: palette.textPrimary,
                      },
                    }}
                  >
                    {target!.lines.join("\n")}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div style={{ color: palette.textMuted, fontSize: 14 }}>
                  Solve to reveal the target code.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Status */}
      <div style={{ marginTop: 16, fontWeight: 600 }}>
        {won && <span style={{ color: "#22c55e" }}>You got it! 🎉</span>}
        {!won && gameOver && <span style={{ color: "#ef4444" }}>Out of tries. Try again!</span>}
      </div>
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${color}`,
        color,
        borderRadius: 999,
        padding: "2px 10px",
        fontWeight: 600,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

function CodeBoard({ feedback }: { feedback: LineFeedback[] }) {
  return (
    <div style={{ maxHeight: 360, overflow: "auto", paddingRight: 4 }}>
      {feedback.map((f, i) => (
        <div
          key={i}
          className={clsx("line")}
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid",
            marginBottom: 4,
            // was: whiteSpace: "pre"
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            background:
              f.status === "correct"
                ? "rgba(34,197,94,0.15)"
                : f.status === "present"
                ? "rgba(234,179,8,0.15)"
                : isDarkMode
                ? "rgba(148, 163, 184, 0.2)"
                : "rgba(107,114,128,0.10)",
            borderColor:
              f.status === "correct"
                ? "#22c55e"
                : f.status === "present"
                ? "#eab308"
                : isDarkMode
                ? "rgba(148,163,184,0.6)"
                : "#6b7280",
          }}
        >
          {f.line || " "}
        </div>
      ))}
    </div>
  );
}
