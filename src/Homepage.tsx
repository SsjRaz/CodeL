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
        {/* Animated Code Logo */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          {/* Box 1 - Green */}
          <div
            style={{
              width: 62,
              height: 62,
              border: "2px solid #22c55e",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#22c55e",
                animation: "scroll1 8s linear infinite",
                whiteSpace: "pre",
                lineHeight: 1.4,
              }}
            >
              {`if(x>0)\n  y++;\nfor(i)\n  sum\nlet a\nconst\nreturn\n{x:1}\nwhile\nif(x>0)\n  y++;\nfor(i)\n  sum\nlet a\nconst\nreturn\n{x:1}\nwhile`}
            </div>
          </div>

          {/* Box 2 - Yellow */}
          <div
            style={{
              width: 62,
              height: 62,
              border: "2px solid #eab308",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              background: "rgba(234,179,8,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#eab308",
                animation: "scroll2 7s linear infinite",
                whiteSpace: "pre",
                lineHeight: 1.4,
              }}
            >
              {`def fn\n  =>x\nvar z\nfn(a)\nmap()\nelse\ntry{}\n!==\npush\ndef fn\n  =>x\nvar z\nfn(a)\nmap()\nelse\ntry{}\n!==\npush`}
            </div>
          </div>

          {/* Box 3 - Green */}
          <div
            style={{
              width: 62,
              height: 62,
              border: "2px solid #22c55e",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#22c55e",
                animation: "scroll3 6.5s linear infinite",
                whiteSpace: "pre",
                lineHeight: 1.4,
              }}
            >
              {`arr[i]\n++i\nelse{\n  len\ncatch\nimport\nexport\nawait\nasync\narr[i]\n++i\nelse{\n  len\ncatch\nimport\nexport\nawait\nasync`}
            </div>
          </div>

          {/* Box 4 - Yellow */}
          <div
            style={{
              width: 62,
              height: 62,
              border: "2px solid #eab308",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              background: "rgba(234,179,8,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#eab308",
                animation: "scroll4 7.5s linear infinite",
                whiteSpace: "pre",
                lineHeight: 1.4,
              }}
            >
              {`{key}\nconst\ntry{}\n!=\nlen()\nclass\nnull\nfind\nsome\n{key}\nconst\ntry{}\n!=\nlen()\nclass\nnull\nfind\nsome`}
            </div>
          </div>

          {/* Box 5 - Green */}
          <div
            style={{
              width: 62,
              height: 62,
              border: "2px solid #22c55e",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#22c55e",
                animation: "scroll5 6s linear infinite",
                whiteSpace: "pre",
                lineHeight: 1.4,
              }}
            >
              {`class{\n  this\n  new\n()=>\npush()\nfilter\nreduce\nbreak\nclass{\n  this\n  new\n()=>\npush()\nfilter\nreduce\nbreak`}
            </div>
          </div>
        </div>

        {/* Add CSS animations */}
        <style>{`
          @keyframes scroll1 {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          @keyframes scroll2 {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          @keyframes scroll3 {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          @keyframes scroll4 {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          @keyframes scroll5 {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
        `}</style>

        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            margin: "0 0 16px 0",
            letterSpacing: "0.02em",
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