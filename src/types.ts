export type LineStatus = "correct" | "present" | "absent";

export type LineFeedback = {
  line: string;
  status: LineStatus;
};

export type Snippet = {
  id: string;
  title: string;
  language: "javascript" | "python" | "java" | "cpp" | "tsx";
  difficulty: "easy" | "medium" | "hard";
  lines: string[]; // canonical target lines (what players try to guess)
  meta?: { description?: string; tags?: string[] };
};
