import Link from "next/link";
import { Fragment } from "react";

const h2 = "text-2xl text-sub";
const p = "max-w-[75ch] leading-relaxed text-text";
const a = "text-main underline-offset-4 hover:underline";

const SHORTCUTS: [string[], string][] = [
  [["tab", "enter"], "restart the test"],
  [["esc"], "command line (outside courses)"],
  [["ctrl", "shift", "p"], "command line"],
  [["enter"], "next line in a course"],
  [["esc"], "skip or restart a course exercise"],
];

export default function About() {
  return (
    <div className="grid content-start gap-12 fade-in">
      <section className="grid gap-4">
        <h2 className={h2}>about</h2>
        <p className={p}>
          A minimal typing test with the look and feel of{" "}
          <a className={a} href="https://github.com/monkeytypegame/monkeytype">Monkeytype</a>, the complete touch typing courses
          from <a className={a} href="https://github.com/alexei-matveev/gtypist">GNU Typist</a>, and the adaptive learning path and
          typing analytics of <a className={a} href="https://github.com/aradzie/keybr.com">keybr.com</a>. Everything runs in your
          browser. Results and progress are stored only on this device; there is no tracking or telemetry.
        </p>
      </section>
      <section className="grid gap-4">
        <h2 className={h2}>how the courses work</h2>
        <p className={p}>
          Each <Link className={a} href="/courses">course</Link> is an original gtypist lesson script. Tutorials explain a new key;
          drills make you type it. Press <kbd>enter</kbd> at the end of every line (shown as ⏎). A wrong key is marked and the caret
          moves on. Drills don&apos;t allow backspace; speed tests do, but not back past the start of a line. If your error rate is
          above the limit (3% unless the lesson sets another), you repeat the exercise. After each one, press <kbd>r</kbd> to repeat,{" "}
          <kbd>n</kbd> for the next exercise or <kbd>e</kbd> to exit. Press <kbd>esc</kbd> before typing to skip an exercise, or
          while typing to start it again.
        </p>
      </section>
      <section className="grid gap-4">
        <h2 className={h2}>how the learning path works</h2>
        <p className={p}>
          The <Link className={a} href="/learn">learning path</Link> starts with the six most common letters. Every lesson measures how
          fast you type each key; once every unlocked key is above your target speed (35 wpm by default), the next letter is added.
          Each lesson is built around your weakest key, using real words when enough fit the letters you know and pronounceable
          made-up words otherwise. The cursor waits for the right key. See how you are doing in{" "}
          <Link className={a} href="/analytics">analytics</Link>.
        </p>
      </section>
      <section className="grid gap-4">
        <h2 className={h2}>keyboard shortcuts</h2>
        <dl className="grid max-w-[75ch] grid-cols-[auto_1fr] gap-x-6 gap-y-2 leading-relaxed">
          {SHORTCUTS.map(([keys, what]) => (
            <Fragment key={what}>
              <dt className="text-sub">
                {keys.map((k, i) => (
                  <Fragment key={k}>
                    {i > 0 && " + "}
                    <kbd>{k}</kbd>
                  </Fragment>
                ))}
              </dt>
              <dd className="text-text">{what}</dd>
            </Fragment>
          ))}
        </dl>
      </section>
      <section className="grid gap-4">
        <h2 className={h2}>license</h2>
        <p className={p}>
          This project is free software under the GNU General Public License v3.0. It includes material from two GPL-3.0 projects:
          the theme palettes, word lists, quotes, fonts, sounds and stat formulas come from Monkeytype, and the lesson scripts in{" "}
          <code>lessons/</code> come from GNU Typist (Copyright © 1998–2003 Simon Baldwin, © 2003–2012 GNU Typist Development Team).
          The adaptive learning path and analytics are ported from keybr.com (by Aliaksandr Radzivanovich and contributors),
          licensed under the GNU Affero General Public License v3.0. The license texts are in <code>LICENSE</code> and{" "}
          <code>LICENSES/AGPL-3.0.txt</code>.
        </p>
      </section>
    </div>
  );
}
