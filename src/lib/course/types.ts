// Compiled form of a gtypist `.typ` script. One statement per gtypist command;
// multi-line commands (T:, I:, D:, d:, S:, s:, M:) are folded with their
// ` :` continuation lines. Execution semantics live in `player.ts`.

export type DrillKind = "D" | "d" | "S" | "s";

export type Stmt =
  | { op: "label"; name: string }
  | { op: "banner"; text: string }
  | { op: "tutorial"; lines: string[] }
  | { op: "instruction"; lines: string[] }
  /** `text` has a trailing "\n" after every line, exactly like gtypist's buffer_command. */
  | { op: "drill"; kind: DrillKind; text: string }
  | { op: "goto"; label: string }
  | { op: "ygoto"; label: string }
  | { op: "ngoto"; label: string }
  | { op: "exit" }
  | { op: "query"; text: string }
  | { op: "keybind"; key: number; label: string | null }
  | { op: "errorMax"; value: number | "default"; persistent: boolean }
  | { op: "onFailure"; label: string | null; persistent: boolean }
  | { op: "menu"; up: string | null; hasUp: boolean; title: string; items: MenuItem[] };

export interface MenuItem {
  label: string;
  text: string;
  /** Statement indexes of the scored drills (D:/S:) that belong to this item's lesson. */
  drills: number[];
}

export interface CourseScript {
  id: string;
  title: string;
  stmts: Stmt[];
  labels: Record<string, number>;
}

export interface CourseMeta {
  id: string;
  title: string;
  group: string;
  description: string;
  drills: number;
  /** Scored drills (D: and S:) — what progress is measured against. */
  scored: number;
}
