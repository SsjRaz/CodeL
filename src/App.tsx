// src/App.tsx
import { useState } from "react";
import { LightAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import clsx from "classnames";
import completeCodeSnippets from "./data/complete-the-code.json";
import findBugSnippets from "./data/find-the-bug.json";
import { normalizeLines } from "./lib/utils";
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

export default function App() {
  // ALL useState hooks MUST be at the top before any conditions
  const [gameMode, setGameMode] = useState<"bug" | "complete" | null>(null);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [allFeedback, setAllFeedback] = useState<LineFeedback[][]>([]);
  const [showHint, setShowHint] = useState(false);

  // Select snippet based on game mode (for now, always use first one)
  const bugSnippet: BugSnippet | null = gameMode === "bug" 
    ? (findBugSnippets as BugSnippet[])[0] 
    : null;
  
  const target: CompleteCodeSnippet | null = gameMode === "complete"
    ? (completeCodeSnippets as CompleteCodeSnippet[])[0]
    : null;

  const lastFb = allFeedback.at(-1);
  const lastWasAllCorrect =
    lastFb?.every((f) => f.status === "correct") ?? false;

  // Game ends on win or after MAX_TRIES
  const gameOver = guesses.length >= MAX_TRIES || lastWasAllCorrect;
  
  // For bug mode: check if the guessed line number is correct
  const wonBugMode = gameMode === "bug" && bugSnippet && 
    guesses.some(guess => parseInt(guess) === bugSnippet.bugLineNumber);
  
  // For complete mode: check if code matches
  const wonCompleteMode = gameMode === "complete" && target &&
    lastWasAllCorrect &&
    (guesses.length > 0 &&
      normalizeLines(guesses[guesses.length - 1]).length === target.lines.length);

  const won = wonBugMode || wonCompleteMode;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (gameOver) return;

    if (gameMode === "bug") {
      // Bug finding mode: validate line number
      const lineNum = parseInt(input);
      if (isNaN(lineNum) || lineNum < 1 || lineNum > (bugSnippet?.buggyLines.length || 0)) {
        return;
      }
      setGuesses((prev) => [...prev, input]);
      setInput("");
    } else if (gameMode === "complete" && target) {
      // Complete the code mode: check code match
      const gLines = normalizeLines(input);
      if (!gLines.length) return;

      const fb = scoreGuess(gLines, target.lines);
      setGuesses((prev) => [...prev, input]);
      setAllFeedback((prev) => [...prev, fb]);
      setInput("");
    }
  }

  function resetGame() {
    setGameMode(null);
    setInput("");
    setGuesses([]);
    setAllFeedback([]);
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
            {/* Left: input and feedback */}
            <div style={{ flex: 1 }}>
              <form onSubmit={onSubmit}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
                  Type the line number with the bug (1-{bugSnippet.buggyLines.length})
                </label>
                <input
                  type="number"
                  min="1"
                  max={bugSnippet.buggyLines.length}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
                    Tries left: {Math.max(0, MAX_TRIES - guesses.length)}
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
                  💡 <strong>Hint:</strong> {bugSnippet.hint}
                </div>
              )}

              {/* Feedback board */}
              <div style={{ marginTop: 16 }}>
                {guesses.map((guess, gi) => {
                  const guessedLine = parseInt(guess);
                  const isCorrect = guessedLine === bugSnippet.bugLineNumber;
                  return (
                    <div key={gi} style={{ marginBottom: 10 }}>
                      <div style={{ 
                        fontSize: 14, 
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "2px solid",
                        borderColor: isCorrect ? "#22c55e" : "#ef4444",
                        background: isCorrect ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: isCorrect ? "#15803d" : "#991b1b",
                        fontWeight: 600
                      }}>
                        Guess #{gi + 1}: Line {guess} {isCorrect ? "✓ Correct!" : "✗ Wrong"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: code display */}
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
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>{bugSnippet.title}</h3>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  Language: {bugSnippet.language} • Difficulty: {bugSnippet.difficulty}
                </div>
                
                {/* Show buggy code with line numbers */}
                <div style={{ position: "relative" }}>
                  <div style={{ 
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
                    lineHeight: 1.5
                  }}>
                    {bugSnippet.buggyLines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div style={{ marginLeft: 40 }}>
                    <SyntaxHighlighter 
                      language={bugSnippet.language}
                      customStyle={{
                        background: 'transparent',
                        padding: 0,
                        margin: 0,
                        color: '#000000'
                      }}
                      codeTagProps={{
                        style: {
                          color: '#000000'
                        }
                      }}
                    >
                      {bugSnippet.buggyLines.join("\n")}
                    </SyntaxHighlighter>
                  </div>
                </div>

                {gameOver && (
                  <div style={{ marginTop: 12, padding: 12, background: won ? "#d1fae5" : "#fee2e2", borderRadius: 6 }}>
                    <strong style={{ color: won ? "#065f46" : "#991b1b" }}>
                      {won ? "🎉 Correct!" : "❌ Out of tries"}
                    </strong>
                    <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                      <strong>Bug is on line {bugSnippet.bugLineNumber}</strong>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                      <strong>Explanation:</strong> {bugSnippet.explanation}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <strong>Fixed code:</strong>
                      <SyntaxHighlighter 
                        language={bugSnippet.language} 
                        customStyle={{ 
                          marginTop: 8, 
                          fontSize: 12,
                          color: '#000000'
                        }}
                        codeTagProps={{
                          style: {
                            color: '#000000'
                          }
                        }}
                      >
                        {bugSnippet.fixedLines.join("\n")}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
                    Tries left: {Math.max(0, MAX_TRIES - guesses.length)}
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
                  💡 <strong>Hint:</strong> {target.hint}
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
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>{target.title}</h3>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  Language: {target.language} • Difficulty: {target.difficulty}
                </div>
                {gameOver ? (
                  <SyntaxHighlighter language={target.language}>
                    {target.lines.join("\n")}
                  </SyntaxHighlighter>
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
    <div>
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
            whiteSpace: "pre",
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