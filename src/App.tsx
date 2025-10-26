// src/App.tsx
import { useState } from "react";
import { LightAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import clsx from "classnames";
import snippets from "./data/snippets.json";
import { normalizeLines } from "./lib/utils";
import { scoreGuess } from "./lib/scoring";
import type { LineFeedback, Snippet } from "./types";
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

export default function App() {
  // ALL useState hooks MUST be at the top before any conditions
  const [gameMode, setGameMode] = useState<"bug" | "complete" | null>(null);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [allFeedback, setAllFeedback] = useState<LineFeedback[][]>([]);

  // For MVP, always pick the first snippet. Later: pick by daily seed or mode.
  const target: Snippet = (snippets as Snippet[])[0];

  const lastFb = allFeedback.at(-1);
  const lastWasAllCorrect =
    lastFb?.every((f) => f.status === "correct") ?? false;

  // Game ends on win or after MAX_TRIES
  const gameOver = guesses.length >= MAX_TRIES || lastWasAllCorrect;
  const won =
    lastWasAllCorrect &&
    // also require same length to avoid "all correct subset" edge case
    (guesses.length > 0 &&
      normalizeLines(guesses[guesses.length - 1]).length ===
        target.lines.length);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (gameOver) return;

    const gLines = normalizeLines(input);
    if (!gLines.length) return;

    const fb = scoreGuess(gLines, target.lines);
    setGuesses((prev) => [...prev, input]);
    setAllFeedback((prev) => [...prev, fb]);
    setInput("");
  }

  // Show homepage if no mode selected - AFTER all hooks
  if (!gameMode) {
    return <Homepage onSelectMode={setGameMode} />;
  }

  return (
    <div style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>CodeL — Code Wordle (MVP)</h1>
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
            <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
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
            </div>
          </form>

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