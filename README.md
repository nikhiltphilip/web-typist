# monkey-typist

A typing website with Monkeytype's look and feel and GNU Typist's touch typing
courses. Next.js 15, React 19, Tailwind v4. Everything runs in the browser;
results and course progress are kept in IndexedDB.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + course player unit tests
npm run lessons    # recompile lessons/*.typ → public/courses/*.json
npm run preview    # production build on :3211, alongside `npm run dev`
```

`next dev` runs React's development build, which is several times slower per
keystroke. Judge typing feel on `npm run preview`.

## Deploying (Cloudflare Pages or any static host)

Every page is prerendered and nothing runs on a server, so the site exports
to plain files:

```bash
npm run export     # → out/  (static HTML, JS, lesson JSON, fonts, sounds)
```

Cloudflare Pages, Git integration: build command `npm run export`, build
output directory `out`, environment variable `NODE_VERSION=22`.
Or upload directly: `npx wrangler pages deploy out --project-name monkey-typist`.

## Performance

Keystroke latency is checked with `node e2e/perf.mjs <url>` (Event Timing API,
CPU throttled 4×), `node e2e/trace.mjs <url> words|course` (main-thread time
by category) and `node e2e/first-key.mjs <url>` (CPU profile of the first key).
What keeps typing fast:

- Focus mode is a `data-focused` attribute on `<html>`, set a frame after the
  first keystroke. It's not React state, so nothing re-renders.
- `useCaret` reads all layout before writing any style, caches line metrics,
  and skips writes that wouldn't change anything.
- The result screen renders after the final keystroke has painted
  (`startTransition` / `afterPaint`), and Chart.js is code-split.
- Live timer/wpm re-render only when their text changes (`useLiveText`).

## Layout

| Path | What it is |
|---|---|
| `src/lib/engine/words.ts` | Monkeytype-style word test (space commits a word, backspace only re-enters a mistyped word) |
| `src/lib/engine/stream.ts` | gtypist drill/speed-test engine: Enter at every line end, no backspace in drills, error re-sync, word-processor mode |
| `src/lib/engine/stats.ts` | wpm / raw / accuracy / consistency, ported from Monkeytype |
| `src/lib/course/player.ts` | Runs a compiled gtypist script: labels, gotos, E:/F: error limits, R/N/E prompt, menus, Y/N queries |
| `scripts/convert-lessons.ts` | `.typ` → JSON compiler (rebuilds the missing menu in `kthu.typ`) |
| `src/components/typing/` | Words, course text, smooth caret, result screen and chart |
| `src/lib/themes.ts` | Theme palettes (catppuccin is the default) |
| `e2e/` | Playwright screenshot scripts (`node e2e/course-flow.mjs`), pointed at the system Brave |

The product name lives in `src/lib/brand.ts`.

## License

GPL-3.0. Theme palettes, word lists, quotes, fonts, sounds and stat formulas
come from [Monkeytype](https://github.com/monkeytypegame/monkeytype); the
lesson scripts in `lessons/` come from
[GNU Typist](https://github.com/alexei-matveev/gtypist). Both are GPL-3.0.
