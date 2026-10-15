// Compiles gtypist `.typ` lesson scripts (lessons/*.typ) into JSON the course
// player can run: public/courses/<id>.json plus src/data/courses.json (index).
//
//   npx tsx scripts/convert-lessons.ts
//
// Parsing mirrors gtypist's script.c: comment lines start with '#' or '!',
// blank lines are skipped, trailing whitespace is trimmed, column 0 is the
// command and column 1 must be ':'. Continuation lines use ' ' as command.

import fs from "node:fs";
import path from "node:path";
import type { CourseMeta, CourseScript, DrillKind, MenuItem, Stmt } from "../src/lib/course/types";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "lessons");
const OUT = path.join(ROOT, "public", "courses");
const INDEX = path.join(ROOT, "src", "data", "courses.json");

// Display order and names. gtypist's own top menu (gtypist.typ) groups the
// English series like this; the rest are the ktouch/other-language imports.
const CATALOG: Record<string, { title: string; group: string; description: string }> = {
  q: { group: "english · qwerty", title: "Quick QWERTY course", description: "learn the whole keyboard in 5 lessons" },
  r: { group: "english · qwerty", title: "Long QWERTY course", description: "the same keys, slower and deeper, 14 lessons" },
  t: { group: "english · qwerty", title: "QWERTY touch typing", description: "16 lessons of touch typing fundamentals" },
  v: { group: "english · qwerty", title: "Yet more QWERTY lessons", description: "19 lessons of extra practice" },
  u: { group: "english · qwerty", title: "QWERTY review", description: "13 review lessons" },
  s: { group: "english · drills", title: "Speed drills", description: "build speed once you know the keys" },
  m: { group: "english · drills", title: "Typing drills", description: "11 lessons of mixed drills" },
  n: { group: "english · drills", title: "Calculator keypad", description: "number pad lessons" },
  d: { group: "english · layouts", title: "Dvorak touch typing", description: "14 lessons for the Dvorak layout" },
  c: { group: "english · layouts", title: "Colemak touch typing", description: "17 lessons for the Colemak layout" },
  demo: { group: "other", title: "Command demonstration", description: "every gtypist command, explained" },
};

function parse(id: string, raw: string): CourseScript {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "" && l[0] !== "#" && l[0] !== "!");

  const stmts: Stmt[] = [];
  const labels: Record<string, number> = {};
  let i = 0;

  const data = (l: string) => l.slice(2);
  // Collect this line plus its ` :` continuations.
  const block = (): string[] => {
    const out = [data(lines[i++])];
    while (i < lines.length && lines[i][0] === " " && lines[i][1] === ":") out.push(data(lines[i++]));
    return out;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line[1] !== ":") throw new Error(`${id}: missing ':' in "${line}"`);
    const cmd = line[0];
    switch (cmd) {
      case "*": {
        const name = data(line).trim();
        labels[name] = stmts.length;
        stmts.push({ op: "label", name });
        i++;
        break;
      }
      case "B":
        stmts.push({ op: "banner", text: data(line).trim() });
        i++;
        break;
      case "T":
        stmts.push({ op: "tutorial", lines: block() });
        break;
      case "I":
        stmts.push({ op: "instruction", lines: block().slice(0, 2) });
        break;
      case "D":
      case "d":
      case "S":
      case "s":
        stmts.push({ op: "drill", kind: cmd as DrillKind, text: block().map((l) => l + "\n").join("") });
        break;
      case "G":
        stmts.push({ op: "goto", label: data(line).trim() });
        i++;
        break;
      case "Y":
        stmts.push({ op: "ygoto", label: data(line).trim() });
        i++;
        break;
      case "N":
        stmts.push({ op: "ngoto", label: data(line).trim() });
        i++;
        break;
      case "X":
        stmts.push({ op: "exit" });
        i++;
        break;
      case "Q":
        stmts.push({ op: "query", text: data(line).trim() });
        i++;
        break;
      case "K": {
        const m = data(line).trim().match(/^(\d+):(\S+)/);
        if (!m) throw new Error(`${id}: invalid key binding "${line}"`);
        const label = /^null$/i.test(m[2]) ? null : m[2];
        stmts.push({ op: "keybind", key: Number(m[1]), label });
        i++;
        break;
      }
      case "E": {
        let v = data(line).trim();
        const persistent = v.endsWith("*");
        if (persistent) v = v.slice(0, -1);
        if (/^default$/i.test(v)) stmts.push({ op: "errorMax", value: "default", persistent });
        else {
          if (!v.endsWith("%")) throw new Error(`${id}: missing '%' in "${line}"`);
          stmts.push({ op: "errorMax", value: parseFloat(v), persistent });
        }
        i++;
        break;
      }
      case "F": {
        let v = data(line).trim();
        const persistent = v.endsWith("*");
        if (persistent) v = v.slice(0, -1);
        stmts.push({ op: "onFailure", label: /^null$/i.test(v) ? null : v, persistent });
        i++;
        break;
      }
      case "M": {
        const [head, ...rest] = block();
        let h = head.trim();
        let up: string | null = null;
        let hasUp = false;
        const upMatch = h.match(/^up=(\S+)\s*/i);
        if (upMatch) {
          hasUp = true;
          up = /^_exit$/i.test(upMatch[1]) ? null : upMatch[1];
          h = h.slice(upMatch[0].length);
        }
        const title = h.slice(h.indexOf('"') + 1, h.lastIndexOf('"'));
        const items: MenuItem[] = rest.map((r) => {
          const t = r.trim();
          const label = t.split(/\s+/)[0];
          const text = t.slice(t.indexOf('"') + 1, t.lastIndexOf('"'));
          return { label, text, drills: [] };
        });
        stmts.push({ op: "menu", up, hasUp, title, items });
        break;
      }
      case " ":
        throw new Error(`${id}: stray continuation line "${line}"`);
      default:
        throw new Error(`${id}: unknown command '${cmd}' in "${line}"`);
    }
  }

  // Some ktouch imports (kthu.typ) lost their generated MENU section upstream.
  // Rebuild it from the S_LESSONn labels and the banner that follows each.
  const referenced = new Set<string>();
  for (const s of stmts) {
    if ((s.op === "goto" || s.op === "ygoto" || s.op === "ngoto") && s.label) referenced.add(s.label);
    if (s.op === "keybind" && s.label) referenced.add(s.label);
  }
  if (referenced.has("MENU") && !("MENU" in labels)) {
    const items: MenuItem[] = Object.keys(labels)
      .filter((l) => /^S_LESSON\d+$/.test(l))
      .map((label) => {
        const banner = stmts.slice(labels[label]).find((s) => s.op === "banner");
        const text = banner?.op === "banner" ? banner.text.replace(/^Lesson \d+:\s*/, "") : label;
        return { label, text, drills: [] };
      });
    // Same end-of-lesson blocks the ktouch2typ generator writes elsewhere.
    for (let n = 1; n <= items.length; n++) {
      if (`E_LESSON${n}` in labels) continue;
      labels[`E_LESSON${n}`] = stmts.length;
      stmts.push({ op: "label", name: `E_LESSON${n}` });
      if (n < items.length) {
        stmts.push({ op: "query", text: `Do you want to continue to lesson ${n + 1} [Y/N] ?` });
        stmts.push({ op: "ngoto", label: "MENU" });
        stmts.push({ op: "goto", label: `S_LESSON${n + 1}` });
      } else stmts.push({ op: "goto", label: "MENU" });
    }
    labels.MENU = stmts.length;
    stmts.push({ op: "label", name: "MENU" });
    stmts.push({ op: "menu", up: null, hasUp: false, title: `${id} lessons`, items });
    console.warn(`${id}: MENU label missing upstream — rebuilt from ${items.length} S_LESSON labels`);
  }
  for (const l of referenced) if (!(l in labels)) console.warn(`${id}: jump to missing label '${l}'`);

  // Assign each menu item the scored drills of its lesson: everything from its
  // label up to the next label that some menu item points at.
  const itemStarts = new Set<number>();
  for (const s of stmts) if (s.op === "menu") for (const it of s.items) if (it.label in labels) itemStarts.add(labels[it.label]);
  const sortedStarts = [...itemStarts].sort((a, b) => a - b);
  for (const s of stmts) {
    if (s.op !== "menu") continue;
    for (const it of s.items) {
      const start = labels[it.label];
      if (start === undefined) continue;
      const end = sortedStarts.find((x) => x > start) ?? stmts.length;
      for (let k = start; k < end; k++) {
        const d = stmts[k];
        if (d.op === "drill" && (d.kind === "D" || d.kind === "S")) it.drills.push(k);
      }
    }
  }

  const firstMenu = stmts.find((s) => s.op === "menu");
  const firstBanner = stmts.find((s) => s.op === "banner");
  const title =
    CATALOG[id]?.title ??
    (firstMenu?.op === "menu" ? firstMenu.title.replace(/^ktouch lesson:\s*/i, "") : undefined) ??
    (firstBanner?.op === "banner" ? firstBanner.text : id);

  return { id, title, stmts, labels };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.dirname(INDEX), { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".typ")).sort();
  const metas: CourseMeta[] = [];

  for (const f of files) {
    const id = f.replace(/\.typ$/, "");
    const script = parse(id, fs.readFileSync(path.join(SRC, f), "utf8"));
    fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(script));
    const drills = script.stmts.filter((s) => s.op === "drill").length;
    const scored = script.stmts.filter((s) => s.op === "drill" && (s.kind === "D" || s.kind === "S")).length;
    const cat = CATALOG[id];
    metas.push({
      id,
      title: script.title,
      group: cat?.group ?? (id.startsWith("kt") ? "other languages · ktouch" : "other languages"),
      description: cat?.description ?? `${drills} exercises`,
      drills,
      scored,
    });
  }

  const order = Object.keys(CATALOG);
  const rank = (m: CourseMeta) => (order.includes(m.id) ? order.indexOf(m.id) : order.length);
  metas.sort((a, b) => rank(a) - rank(b) || a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
  fs.writeFileSync(INDEX, JSON.stringify(metas, null, 2) + "\n");
  console.log(`compiled ${metas.length} courses → public/courses/, index → src/data/courses.json`);
}

main();
