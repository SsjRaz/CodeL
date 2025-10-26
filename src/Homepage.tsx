import { useState } from "react";

interface HomepageProps {
  onSelectMode: (mode: "bug" | "complete") => void;
}

export default function Homepage({ onSelectMode }: HomepageProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        padding: "0 16px",
        zIndex: 9999,
      }}
    >
      {/* Main content */}
      <div
        style={{
          textAlign: "center",
          maxWidth: 500,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            margin: "0 0 16px 0",
            letterSpacing: "0.02em",
            color: "#000000",
          }}
        >
          CodeL
        </h2>
        <p
          style={{
            fontSize: 18,
            color: "#6b7280",
            marginBottom: 48,
            lineHeight: 1.5,
          }}
        >
          A coding puzzle game inspired by Wordle
        </p>

        {/* Dropdown button container */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              background: "#6aaa64",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "16px 48px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
              minWidth: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#5a9a54")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#6aaa64")
            }
          >
            Play
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              style={{
                transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path
                d="M1 1L6 6L11 1"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #d3d6da",
                borderRadius: 4,
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              <button
                onClick={() => onSelectMode("bug")}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: "white",
                  border: "none",
                  borderBottom: "1px solid #d3d6da",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.2s",
                  color: "#000000",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                🐛 Find the Bug
              </button>
              <button
                onClick={() => onSelectMode("complete")}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: "white",
                  border: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.2s",
                  color: "#000000",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                ✨ Complete the Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}