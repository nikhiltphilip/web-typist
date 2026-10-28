"use client";

import type { ReactNode } from "react";
import { db } from "@/lib/db";
import type { LearnSettings } from "@/lib/learn/settings";
import { DEFAULT_SETTINGS, FONT_SIZES, FONTS, getSettings, setSetting, useSettings, type Settings } from "@/lib/settings";
import { playClick } from "@/lib/sound";
import { applyTheme, THEME_NAMES, THEMES } from "@/lib/themes";
import { Select } from "./Select";
import { Button, cn, Switch } from "./ui";

// A title and description on the left, the control on the right.
function Setting({ title, description, children, full }: { title: string; description: ReactNode; children: ReactNode; full?: boolean }) {
  return (
    <div className={cn("grid gap-x-8 gap-y-3 border-b border-sub-alt py-5 last:border-0", full ? "grid-cols-1" : "items-center md:grid-cols-[1fr_auto]")}>
      <div className="grid content-start gap-1">
        <h3 className="text-text">{title}</h3>
        <p className="text-sm leading-relaxed text-sub">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">{children}</div>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-8">
      <h2 className="mb-2 text-xl text-main">{title}</h2>
      {children}
    </section>
  );
}

function Choices<K extends keyof Settings>({ k, values, label = String }: { k: K; values: Settings[K][]; label?: (v: Settings[K]) => string }) {
  const s = useSettings();
  return (
    <Select
      value={s[k]}
      options={values.map((v) => ({ value: v, label: label(v) }))}
      onChange={(v) => {
        setSetting(k, v);
        if (k === "sound" && v !== "off") setTimeout(playClick, 0);
      }}
    />
  );
}

type BoolKey<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T];

function Toggle({ k }: { k: BoolKey<Settings> }) {
  const s = useSettings();
  return <Switch on={s[k]} onChange={(v) => setSetting(k, v)} />;
}

const setLearn = <K extends keyof LearnSettings>(k: K, v: LearnSettings[K]) => setSetting("learn", { ...getSettings().learn, [k]: v });

/** Same as Choices, for the learning path's nested settings. */
function LearnChoices<K extends keyof LearnSettings>({ k, values, label = String }: { k: K; values: LearnSettings[K][]; label?: (v: LearnSettings[K]) => string }) {
  const { learn } = useSettings();
  return <Select value={learn[k]} options={values.map((v) => ({ value: v, label: label(v) }))} onChange={(v) => setLearn(k, v)} />;
}

function LearnToggle({ k }: { k: BoolKey<LearnSettings> }) {
  const { learn } = useSettings();
  return <Switch on={learn[k]} onChange={(v) => setLearn(k, v)} />;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function SettingsPage() {
  const s = useSettings();
  return (
    <div className="mx-auto grid w-full max-w-4xl content-start gap-12 pb-16 fade-in">
      <Section title="appearance">
        <Setting title="theme" description="Colour theme for the whole site. Hover a theme in the command line (esc → theme) to preview it." full>
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
            {THEME_NAMES.map((t) => {
              const th = THEMES[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSetting("theme", t);
                    applyTheme(t);
                  }}
                  aria-pressed={s.theme === t}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-[filter] duration-125 hover:brightness-110"
                  style={{ background: th.bg, color: th.text, boxShadow: s.theme === t ? `inset 0 0 0 2px ${th.main}` : `inset 0 0 0 1px ${th.subAlt}` }}
                >
                  <span>{t.replace(/_/g, " ")}</span>
                  <span className="flex gap-1">
                    {[th.main, th.sub, th.error].map((c, i) => (
                      <span key={i} className="h-2 w-2" style={{ background: c }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Setting>
        <Setting title="font family" description="Font used everywhere on the site.">
          <Select
            value={s.font}
            options={FONTS.map((f) => ({ value: f, label: <span style={{ fontFamily: `"${f}", monospace` }}>{f}</span> }))}
            onChange={(f) => setSetting("font", f)}
          />
        </Setting>
        <Setting title="font size" description="Size of the words in the typing test. Course drills cap at 24px so 80-column lessons fit.">
          <Choices k="fontSize" values={FONT_SIZES} label={(v) => `${v}px`} />
        </Setting>
        <Setting title="caret style" description="Shape of the typing caret.">
          <Choices k="caretStyle" values={["off", "default", "block", "outline", "underline"]} label={(v) => (v === "default" ? "|" : v === "block" ? "▮" : v === "outline" ? "▯" : v === "underline" ? "_" : "off")} />
        </Setting>
        <Setting title="smooth caret" description="How quickly the caret glides to the next letter.">
          <Choices k="smoothCaret" values={["off", "slow", "medium", "fast"]} />
        </Setting>
        <Setting title="live timer" description="Show the countdown (or word count) above the text while typing.">
          <Toggle k="liveTimer" />
        </Setting>
        <Setting title="live speed" description="Show your current wpm above the text while typing.">
          <Toggle k="liveSpeed" />
        </Setting>
        <Setting title="live accuracy" description="Show your current accuracy while typing.">
          <Toggle k="liveAcc" />
        </Setting>
      </Section>

      <Section title="sound">
        <Setting title="play sound on click" description="Key click sound pack.">
          <Choices k="sound" values={["off", "click1", "click4", "click6"]} />
        </Setting>
        <Setting title="play sound on error" description="A distinct sound when you hit the wrong key.">
          <Toggle k="errorSound" />
        </Setting>
        <Setting title="volume" description="Volume of all sounds.">
          <Choices k="volume" values={[0.1, 0.25, 0.5, 0.75, 1]} label={(v) => `${Math.round(v * 100)}%`} />
        </Setting>
      </Section>

      <Section title="courses">
        <Setting
          title="max error rate"
          description="Default limit for drills and speed tests (gtypist -e). Above it you repeat the exercise. A lesson can set its own limit with E:, which wins."
        >
          <Choices k="maxError" values={[1, 2, 3, 5, 10]} label={(v) => `${v}%`} />
        </Setting>
        <Setting title="word processor mode" description="Space also completes a line, and extra spaces and blank lines are skipped for you (gtypist -w).">
          <Toggle k="wordProcessor" />
        </Setting>
        <Setting title="forbid skipping" description="Esc can't skip an exercise; you must repeat it or exit (gtypist -k).">
          <Toggle k="noSkip" />
        </Setting>
        <Setting title="always sure" description="Don't ask for confirmation before leaving a lesson (gtypist -S).">
          <Toggle k="alwaysSure" />
        </Setting>
      </Section>

      <Section id="learn" title="learning path">
        <Setting title="target speed" description="A key counts as learned once you type it this fast. The next key unlocks when every unlocked key is there.">
          <LearnChoices k="targetSpeed" values={[100, 150, 175, 200, 250, 300]} label={(v) => `${Math.round(v / 5)} wpm`} />
        </Setting>
        <Setting title="alphabet size" description="Unlock extra keys straight away instead of starting with six.">
          <LearnChoices k="alphabetSize" values={[0, 0.25, 0.5, 0.75, 1]} label={pct} />
        </Setting>
        <Setting title="recover keys" description="Off: a key stays unlocked once it has reached the target. On: every key must stay above the target before a new one is added.">
          <LearnToggle k="recoverKeys" />
        </Setting>
        <Setting title="natural words" description="Use real words when enough of them fit the unlocked letters; otherwise pronounceable pseudo-words.">
          <LearnToggle k="naturalWords" />
        </Setting>
        <Setting title="keyboard order" description="Unlock keys home row first, instead of by how common the letter is.">
          <LearnToggle k="keyboardOrder" />
        </Setting>
        <Setting title="lesson length" description="Characters per lesson, from about 100 to 200.">
          <LearnChoices k="length" values={[0, 0.5, 1]} label={(v) => (v === 0 ? "short" : v === 1 ? "long" : "medium")} />
        </Setting>
        <Setting title="capital letters" description="How often a word starts with a capital.">
          <LearnChoices k="capitals" values={[0, 0.1, 0.25, 0.5]} label={pct} />
        </Setting>
        <Setting title="punctuation" description="How often a word gets punctuation.">
          <LearnChoices k="punctuators" values={[0, 0.1, 0.25, 0.5]} label={pct} />
        </Setting>
        <Setting title="repeat words" description="Type each word this many times in a row.">
          <LearnChoices k="repeatWords" values={[1, 2, 3]} />
        </Setting>
        <Setting title="daily goal" description="Minutes of practice to aim for each day.">
          <LearnChoices k="dailyGoal" values={[0, 10, 20, 30, 60]} label={(v) => (v ? `${v} min` : "off")} />
        </Setting>
        <Setting title="stop on error" description="The cursor waits until you press the right key. Off: wrong letters pile up and must be deleted.">
          <LearnToggle k="stopOnError" />
        </Setting>
        <Setting title="forgive errors" description="Recover automatically when you replace or skip a single character.">
          <LearnToggle k="forgiveErrors" />
        </Setting>
        <Setting title="space skips words" description="Pressing space in the middle of a word jumps to the next one (the rest counts as missed).">
          <LearnToggle k="spaceSkipsWords" />
        </Setting>
        <Setting title="keyboard" description="Show the on-screen keyboard under the text, with the next key highlighted and each key coloured by your speed.">
          <LearnToggle k="showKeyboard" />
        </Setting>
        <Setting title="hands" description="Show the two hands under the keyboard, lighting up and naming the finger for the next key.">
          <LearnToggle k="showHands" />
        </Setting>
        <Setting title="finger colours" description="Mark each key on the keyboard with the colour of the finger that should press it.">
          <LearnToggle k="fingerHints" />
        </Setting>
        <Setting title="common words" description="How many of the most common words to draw from, and whether to skip short ones.">
          <div className="flex gap-2">
            <LearnChoices k="wordListSize" values={[100, 250, 500, 1000, 5000]} />
            <LearnChoices k="longWordsOnly" values={[false, true]} label={(v) => (v ? "long words only" : "all words")} />
          </div>
        </Setting>
        <Setting title="numbers" description="Leading digits follow Benford's law, like real-world numbers.">
          <LearnToggle k="benford" />
        </Setting>
        <Setting title="custom text" description="Text for the custom text lesson." full>
          <textarea
            defaultValue={s.learn.customText}
            onBlur={(e) => setSetting("learn", { ...getSettings().learn, customText: e.target.value })}
            className="h-28 w-full resize-y rounded-(--roundness) border-0 bg-sub-alt p-3 text-sm text-text caret-caret outline-none"
          />
          <LearnChoices k="customRandomize" values={[false, true]} label={(v) => (v ? "random order" : "in order")} />
        </Setting>
      </Section>

      <Section title="danger zone">
        <Setting title="reset settings" description="Put every setting back to its default.">
          <Button
            text="reset settings"
            onClick={() => {
              if (!confirm("Reset all settings?")) return;
              for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) setSetting(k as keyof Settings, v as never);
              applyTheme(DEFAULT_SETTINGS.theme);
            }}
          />
        </Setting>
        <Setting title="clear history" description="Delete your saved test results and course progress from this browser.">
          <Button
            text="clear history"
            onClick={async () => {
              if (!confirm("Delete all results and course progress?")) return;
              await db().tests.clear();
              await db().drillBests.clear();
              await db().results.clear();
            }}
          />
        </Setting>
      </Section>
    </div>
  );
}
