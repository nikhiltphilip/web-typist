import Link from "next/link";

const h2 = "text-2xl text-sub";
const p = "max-w-[75ch] leading-relaxed text-text";
const a = "text-main underline-offset-4 hover:underline";

export default function About() {
  return (
    <div className="grid content-start gap-12 fade-in">
      <section className="grid gap-4">
        <h2 className={h2}>about</h2>
        <p className={p}>
          A minimal typing test with the look and feel of{" "}
          <a className={a} href="https://github.com/monkeytypegame/monkeytype">Monkeytype</a>, plus the complete touch typing courses
          from <a className={a} href="https://github.com/alexei-matveev/gtypist">GNU Typist</a>. Everything runs in your browser.
          Results and course progress are stored only on this device.
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
        <h2 className={h2}>license</h2>
        <p className={p}>
          This project is free software under the GNU General Public License v3.0. It includes material from two GPL-3.0 projects:
          the theme palettes, word lists, quotes, fonts, sounds and stat formulas come from Monkeytype, and the lesson scripts in{" "}
          <code>lessons/</code> come from GNU Typist (Copyright © 1998–2003 Simon Baldwin, © 2003–2012 GNU Typist Development Team).
          The full license text is in the <code>LICENSE</code> file.
        </p>
      </section>
    </div>
  );
}
