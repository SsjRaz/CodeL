import { useState, useEffect, useRef } from "react";

interface HomepageProps {
  onSelectMode: (mode: "bug" | "complete") => void;
}

export default function Homepage({ onSelectMode }: HomepageProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [rollingOffsets, setRollingOffsets] = useState([0, 0, 0, 0, 0]);
  const [showRandomChar, setShowRandomChar] = useState([false, false, false, false, false]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const targetLetters = ['C', 'o', 'd', 'e', 'L'];
  const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const codeSnippets = [
      "const", "function", "return", "if", "else", "for", "while",
      "let", "var", "class", "import", "export", "async", "await",
      "{", "}", "(", ")", "[", "]", "=>", "===", "!==", ";",
      "true", "false", "null", "undefined", "this", "new", "try",
      "catch", "throw", "break", "continue", "switch", "case"
    ];

    const colors = [
      "#00ff00", "#00ffff", "#ff00ff", "#ffff00", "#ff0000",
      "#0000ff", "#00ff88", "#ff8800", "#8800ff", "#88ff00"
    ];

    class CodeStream {
      x: number;
      y: number;
      speed: number;
      text: string;
      color: string;
      opacity: number;
      direction: "horizontal" | "vertical";

      constructor() {
        this.direction = Math.random() > 0.5 ? "horizontal" : "vertical";
        
        if (this.direction === "horizontal") {
          this.x = -100;
          this.y = Math.random() * canvas.height;
          this.speed = 1 + Math.random() * 2;
        } else {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() > 0.5 ? -50 : canvas.height + 50;
          this.speed = (this.y < 0 ? 1 : -1) * (1 + Math.random() * 2);
        }
        
        this.text = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = 0.3 + Math.random() * 0.4;
      }

      update() {
        if (this.direction === "horizontal") {
          this.x += this.speed;
        } else {
          this.y += this.speed;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = "14px monospace";
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
      }

      isOffScreen() {
        if (this.direction === "horizontal") {
          return this.x > canvas.width + 100;
        } else {
          return this.speed > 0 ? this.y > canvas.height + 50 : this.y < -50;
        }
      }
    }

    let streams: CodeStream[] = [];
    for (let i = 0; i < 50; i++) {
      streams.push(new CodeStream());
    }

    function animate() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      streams.forEach((stream, index) => {
        stream.update();
        stream.draw(ctx);

        if (stream.isOffScreen()) {
          streams[index] = new CodeStream();
        }
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Rolling letters animation - trigger random character
  useEffect(() => {
    const interval = setInterval(() => {
      setRollingOffsets(prev => prev.map(() => Math.random() * allChars.length));
      setShowRandomChar(prev => prev.map(() => Math.random() > 0.90));
      
      // Reset back to original letters after 100ms
      setTimeout(() => {
        setShowRandomChar([false, false, false, false, false]);
      }, 100);
    }, 800);

    return () => clearInterval(interval);
  }, []);

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
        background: "#000000",
        padding: "0 16px",
        zIndex: 9999,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />

      {/* Main content */}
      <div
        style={{
          textAlign: "center",
          maxWidth: 600,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Rolling letter boxes */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            justifyContent: "center",
          }}
        >
          {targetLetters.map((letter, index) => (
            <div
              key={index}
              style={{
                width: 80,
                height: 100,
                border: "3px solid #ffffff",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.7)",
                boxShadow: "0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: "#ffffff",
                  textShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
                  fontFamily: "monospace",
                }}
              >
                {showRandomChar[index] ? allChars[Math.floor(rollingOffsets[index]) % allChars.length] : letter}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: 18,
            color: "#ffffff",
            marginBottom: 48,
            lineHeight: 1.5,
            fontFamily: "monospace",
            textShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
          }}
        >
          A coding puzzle game inspired by Wordle
        </p>

        {/* Dropdown button container */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #ffffff",
              borderRadius: 4,
              padding: "16px 48px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              minWidth: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "monospace",
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#000000";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.color = "#000000";
            }}
          >
            PLAY
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
                stroke="currentColor"
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
                background: "#000000",
                border: "2px solid #ffffff",
                borderRadius: 4,
                boxShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              <button
                onClick={() => onSelectMode("bug")}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: "#000000",
                  border: "none",
                  borderBottom: "1px solid #ffffff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.2s",
                  color: "#ffffff",
                  fontFamily: "monospace",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#000000")
                }
              >
                🐛 Find the Bug
              </button>
              <button
                onClick={() => onSelectMode("complete")}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: "#000000",
                  border: "none",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.2s",
                  color: "#ffffff",
                  fontFamily: "monospace",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#000000")
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