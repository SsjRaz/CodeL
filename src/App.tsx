// src/App.tsx
import React from "react";
import { useState } from "react";
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

interface BugGuess {
  line: number;
  fix: string;
  lineCorrect: boolean;
  fixCorrect: boolean;
}

function normalizeForComparison(text: string): string {
  return normalizeLine(text).replace(/\s+/g, " ").trim();
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

  if (guessLines.length === 1 && fullTarget.includes(guessLines[0])) {
    return true;
  }

  const lineIndex = Math.max(0, snippet.bugLineNumber - 1);
  return (
    guessLines.length === 1 && guessLines[0] === normalizedTarget[lineIndex]
  );
}

export default function App() {
  // ALL useState hooks MUST be at the top before any conditions
  const [gameMode, setGameMode] = useState<"bug" | "complete" | null>(null);
  const [bugLineInput, setBugLineInput] = useState("");
  const [bugFixInput, setBugFixInput] = useState("");
  const [bugGuesses, setBugGuesses] = useState<BugGuess[]>([]);
  const [completeInput, setCompleteInput] = useState("");
  const [completeGuesses, setCompleteGuesses] = useState<string[]>([]);
  const [allFeedback, setAllFeedback] = useState<LineFeedback[][]>([]);
  const [showHint, setShowHint] = useState(false);

  // Select snippet based on game mode (for now, always use first one)
  const bugSnippet: BugSnippet | null = gameMode === "bug" 
    ? (findBugSnippets as BugSnippet[])[0] 
    : null;
  
  const target: CompleteCodeSnippet | null = gameMode === "complete"
    ? (completeCodeSnippets as CompleteCodeSnippet[])[0]
    : null;

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
      setBugFixInput("");
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
    setBugLineInput("");
    setBugFixInput("");
    setBugGuesses([]);
    setCompleteInput("");
    setCompleteGuesses([]);
    setAllFeedback([]);
    setShowHint(false);
  }

  function retryBugMode() {
    setBugLineInput("");
    setBugFixInput("");
    setBugGuesses([]);
    setShowHint(false);
  }

  // Show homepage if no mode selected - AFTER all hooks
  if (!gameMode) {
    return <Homepage onSelectMode={setGameMode} />;
  }

  return (
    <div style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>
          CodeL — {gameMode === "bug" ? "Find the Bug 🐛" : "Complete the Code ✨"}
        </h1>
        <button
          onClick={resetGame}
          style={{
            background: "transparent",
            border: "1px solid #d3d6da",
            borderRadius: 4,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Back to Home
        </button>
      </div>
      
      {gameMode === "bug" && bugSnippet ? (
        // FIND THE BUG MODE
        <>
          <p style={{ color: "#6b7280", marginTop: 0 }}>
            Find the buggy line in <strong>{MAX_TRIES}</strong> tries. Identify which line contains the bug!
          </p>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <form onSubmit={onSubmit}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
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
                    border: "1px solid #e5e7eb",
                    outline: "none",
                  }}
                />
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 8,
                    marginTop: 16,
                  }}
                >
                  Describe or paste the fix (single line or full corrected snippet)
                </label>
                <textarea
                  value={bugFixInput}
                  onChange={(e) => setBugFixInput(e.target!.value)}
                  placeholder={`e.g.\nfor (let i = 0; i < arr.length; i++) {\n  // ...\n}`}
                  rows={4}
                  disabled={gameOver}
                  style={{
                    width: "100%",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 14,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
                <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
                    }}
                  >
                    Submit guess
                  </button>
                  <span style={{ color: "#6b7280" }}>
                    Tries left: {Math.max(0, MAX_TRIES - bugGuesses.length)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
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
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </button>
                </div>
              </form>

              {showHint && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "rgba(234,179,8,0.1)",
                    border: "1px solid #eab308",
                    borderRadius: 8,
                    color: "#854d0e",
                  }}
                >
                  💡 <strong>Hint:</strong> {bugSnippet.hint}
                </div>
              )}

              {/* Feedback board */}
              <div style={{ marginTop: 16 }}>
                {bugGuesses.map((guess, gi) => {
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
                    <div key={gi} style={{ marginBottom: 12 }}>
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
                          marginTop: 6,
                          fontSize: 13,
                          color: "#374151",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          padding: "8px 10px",
                          background: "#ffffff",
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
                })}
              </div>
            </div>

            {/* Show buggy code with line numbers */}
            <div style={{ position: "relative", minWidth: 320 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 30,
                  background: "#f3f4f6",
                  borderRight: "1px solid #e5e7eb",
                  padding: "10px 5px",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#6b7280",
                  lineHeight: 1.5,
                  overflow: "hidden",
                }}
              >
                {bugSnippet.buggyLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code container: limits height and wraps long lines */}
              <div style={{ marginLeft: 40, maxHeight: 360, overflow: "auto" }}>
                <SyntaxHighlighter
                  language={bugSnippet.language}
                  wrapLongLines
                  customStyle={{
                    background: "transparent",
                    padding: 0,
                    margin: 0,
                    color: "#000000",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 400,
                    overflow: "auto",
                  }}
                  codeTagProps={{
                    style: {
                      color: "#000000",
                    },
                  }}
                >
                  {bugSnippet.buggyLines.join("\n")}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
          {gameOver && (
            <div
              style={{
                marginTop: 24,
                display: "flex",
                flexWrap: "wrap",
                gap: 24,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  flex: "1 1 280px",
                  background: won ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${won ? "#22c55e" : "#fca5a5"}`,
                  borderRadius: 12,
                  padding: 16,
                  minWidth: 260,
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
                <div style={{ marginTop: 12, fontSize: 14, color: "#1f2937" }}>
                  <strong>Bug location:</strong> Line {bugSnippet.bugLineNumber}
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "#1f2937" }}>
                  <strong>Explanation:</strong> {bugSnippet.explanation}
                </div>
                {!!bugFixHighlights.length && (
                  <div style={{ marginTop: 12, fontSize: 14, color: "#1f2937" }}>
                    <strong>Key fixes:</strong>
                    <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                      {bugFixHighlights.map((line, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <code
                            style={{
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              background: "#f3f4f6",
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
                {!won && (
                  <button
                    type="button"
                    onClick={retryBugMode}
                    style={{
                      marginTop: 16,
                      background: "#111827",
                      color: "#ffffff",
                      padding: "10px 18px",
                      borderRadius: 8,
                      border: 0,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ↺ Try again
                  </button>
                )}
              </div>
              <div
                style={{
                  flex: "1 1 320px",
                  minWidth: 280,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
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
                    color: "#000000",
                    background: "transparent",
                  }}
                  codeTagProps={{
                    style: {
                      color: "#000000",
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
          <p style={{ color: "#6b7280", marginTop: 0 }}>
            Guess the code snippet in <strong>{MAX_TRIES}</strong> tries. Hints are
            per line: <Badge color="#22c55e" label="correct" />{" "}
            <Badge color="#eab308" label="present" />{" "}
            <Badge color="#6b7280" label="absent" />.
          </p>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            {/* Left: input and feedback */}
            <div style={{ flex: 1 }}>
              <form onSubmit={onSubmit}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
                  Your guess (paste/type the function)
                </label>
                <textarea
                  value={completeInput}
                  onChange={(e) => setCompleteInput(e.target!.value)}
                  placeholder={`e.g.\nfunction reverse(s) {\n  return s.split('').reverse().join('');\n}`}
                  rows={8}
                  disabled={gameOver}
                  style={{
                    width: "100%",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 14,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    outline: "none",
                  }}
                />
                <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
                    }}
                  >
                    Submit guess
                  </button>
                  <span style={{ color: "#6b7280" }}>
                    Tries left: {Math.max(0, MAX_TRIES - completeGuesses.length)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
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
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </button>
                </div>
              </form>

              {showHint && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 12, 
                  background: "rgba(234,179,8,0.1)", 
                  border: "1px solid #eab308",
                  borderRadius: 8,
                  color: "#854d0e"
                }}>
                  💡 <strong>Hint:</strong> {target!.hint}
                </div>
              )}

              {/* Feedback board */}
              <div style={{ marginTop: 16 }}>
                {allFeedback.map((fb, gi) => (
                  <div key={gi} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                      Guess #{gi + 1}
                    </div>
                    <CodeBoard feedback={fb} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: reveal after game ends */}
            <div style={{ flex: 1, minWidth: 320 }}>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                  position: "sticky",
                  top: 24,
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>{target!.title}</h3>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  Language: {target!.language} • Difficulty: {target!.difficulty}
                </div>
                {gameOver ? (
                  <div style={{ maxHeight: 360, overflow: "auto", borderRadius: 10 }}>
                    <SyntaxHighlighter language={target!.language} wrapLongLines>
                      {target!.lines.join("\n")}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    Solve to reveal the target code.
                  </div>
                )}
              </div>
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
                : "rgba(107,114,128,0.10)",
            borderColor:
              f.status === "correct"
                ? "#22c55e"
                : f.status === "present"
                ? "#eab308"
                : "#6b7280",
          }}
        >
          {f.line || " "}
        </div>
      ))}
    </div>
  );
}
