"use client";

import {
  faCircleHalfStroke,
  faFont,
  faGraduationCap,
  faSeedling,
  faGaugeHigh,
  faICursor,
  faTextHeight,
  faTrash,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import type { LearnSettings } from "@/lib/learn/settings";
import { DEFAULT_SETTINGS, FONTS, getSettings, setSetting, useSettings, type Settings } from "@/lib/settings";
import { playClick } from "@/lib/sound";
import { applyTheme, THEME_NAMES, THEMES } from "@/lib/themes";
import { Button, cn, Icon } from "./ui";

// Monkeytype's settings page: a title + description on the left, the
// choices as a row of buttons on the right.
function Setting({ icon, title, description, children, full }: { icon: IconDefinition; title: string; description: ReactNode; children: ReactNode; full?: boolean }) {
  return (
    <div className={cn("grid gap-x-8 gap-y-2", full ? "grid-cols-1" : "md:grid-cols-[2fr_1fr]")}>
      <div className="grid content-start gap-1">
        <div className="flex items-center gap-2 text-sub">
          <Icon icon={icon} /> {title}
        </div>
        <div className="text-sm leading-relaxed text-text">{description}</div>
      </div>
      <div className="flex flex-wrap content-start gap-2">{children}</div>
    </div>
  );
}

function Choices<K extends keyof Settings>({ k, values, label }: { k: K; values: Settings[K][]; label?: (v: Settings[K]) => string }) {
  const s = useSettings();
  return (
    <div className="grid w-full auto-cols-fr grid-flow-col gap-2">
      {values.map((v) => (
        <Button
          key={String(v)}
          active={s[k] === v}
          text={label ? label(v) : String(v)}
          onClick={() => {
            setSetting(k, v);
            if (k === "sound" && v !== "off") setTimeout(playClick, 0);
          }}
        />
      ))}
    </div>
  );
}

const onOff = (v: boolean) => (v ? "on" : "off");

/** Same as Choices, for the learning path's nested settings. */
function LearnChoices<K extends keyof LearnSettings>({ k, values, label }: { k: K; values: LearnSettings[K][]; label?: (v: LearnSettings[K]) => string }) {
  const { learn } = useSettings();
  return (
    <div className="grid w-full auto-cols-fr grid-flow-col gap-2">
      {values.map((v) => (
        <Button
          key={String(v)}
          active={learn[k] === v}
          text={label ? label(v) : String(v)}
          onClick={() => setSetting("learn", { ...getSettings().learn, [k]: v })}
        />
      ))}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function SettingsPage() {
  const s = useSettings();
  return (
    <div className="grid content-start gap-12 fade-in">
      <section className="grid gap-8">
        <h2 className="text-2xl text-sub">appearance</h2>
        <Setting icon={faCircleHalfStroke} title="theme" description="Colour theme for the whole site. Hover a theme in the command line (esc → theme) to preview it." full>
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
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-(--roundness) px-3 py-2 text-sm transition-transform duration-125 hover:scale-[1.04]",
                    s.theme === t && "outline-2 outline-offset-2 outline-[var(--main-color)]",
                  )}
                  style={{ background: th.bg, color: th.main }}
                >
                  <span>{t.replace(/_/g, " ")}</span>
                  <span className="flex gap-1">
                    {[th.main, th.sub, th.text].map((c, i) => (
                      <span key={i} className="h-3 w-3 rounded-full" style={{ background: c }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Setting>
        <Setting icon={faFont} title="font family" description="Font used everywhere on the site." full>
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
            {FONTS.map((f) => (
              <Button key={f} text={f} active={s.font === f} onClick={() => setSetting("font", f)} className="w-full" />
            ))}
          </div>
        </Setting>
        <Setting icon={faTextHeight} title="font size" description="Size of the words in the typing test (in rem). Course drills cap at 1.5 so 80-column lessons fit.">
          <Choices k="fontSize" values={[1, 1.5, 2, 2.5, 3]} />
        </Setting>
        <Setting icon={faICursor} title="caret style" description="Shape of the typing caret.">
          <Choices k="caretStyle" values={["off", "default", "block", "outline", "underline"]} label={(v) => (v === "default" ? "|" : v === "block" ? "▮" : v === "outline" ? "▯" : v === "underline" ? "_" : "off")} />
        </Setting>
        <Setting icon={faICursor} title="smooth caret" description="How quickly the caret glides to the next letter.">
          <Choices k="smoothCaret" values={["off", "slow", "medium", "fast"]} />
        </Setting>
        <Setting icon={faGaugeHigh} title="live speed" description="Show your current wpm above the text while typing.">
          <Choices k="liveSpeed" values={[false, true]} label={(v) => (v ? "show" : "hide")} />
        </Setting>
        <Setting icon={faGaugeHigh} title="live accuracy" description="Show your current accuracy while typing.">
          <Choices k="liveAcc" values={[false, true]} label={(v) => (v ? "show" : "hide")} />
        </Setting>
      </section>

      <section className="grid gap-8">
        <h2 className="text-2xl text-sub">sound</h2>
        <Setting icon={faVolumeHigh} title="play sound on click" description="Key click sound pack.">
          <Choices k="sound" values={["off", "click1", "click4", "click6"]} />
        </Setting>
        <Setting icon={faVolumeHigh} title="play sound on error" description="A distinct sound when you hit the wrong key.">
          <Choices k="errorSound" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faVolumeHigh} title="volume" description="Volume of all sounds.">
          <Choices k="volume" values={[0.1, 0.25, 0.5, 0.75, 1]} label={(v) => `${Math.round(v * 100)}%`} />
        </Setting>
      </section>

      <section className="grid gap-8">
        <h2 className="text-2xl text-sub">courses</h2>
        <Setting
          icon={faGraduationCap}
          title="max error rate"
          description="Default limit for drills and speed tests (gtypist -e). Above it you repeat the exercise. A lesson can set its own limit with E:, which wins."
        >
          <Choices k="maxError" values={[1, 2, 3, 5, 10]} label={(v) => `${v}%`} />
        </Setting>
        <Setting icon={faGraduationCap} title="word processor mode" description="Space also completes a line, and extra spaces and blank lines are skipped for you (gtypist -w).">
          <Choices k="wordProcessor" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faGraduationCap} title="forbid skipping" description="Esc can't skip an exercise; you must repeat it or exit (gtypist -k).">
          <Choices k="noSkip" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faGraduationCap} title="always sure" description="Don't ask for confirmation before leaving a lesson (gtypist -S).">
          <Choices k="alwaysSure" values={[false, true]} label={onOff} />
        </Setting>
      </section>

      <section id="learn" className="grid scroll-mt-8 gap-8">
        <h2 className="text-2xl text-sub">learning path</h2>
        <Setting icon={faSeedling} title="target speed" description="A key counts as learned once you type it this fast. The next key unlocks when every unlocked key is there.">
          <LearnChoices k="targetSpeed" values={[100, 150, 175, 200, 250, 300]} label={(v) => `${Math.round(v / 5)} wpm`} />
        </Setting>
        <Setting icon={faSeedling} title="alphabet size" description="Unlock extra keys straight away instead of starting with six.">
          <LearnChoices k="alphabetSize" values={[0, 0.25, 0.5, 0.75, 1]} label={pct} />
        </Setting>
        <Setting icon={faSeedling} title="recover keys" description="Off: a key stays unlocked once it has reached the target. On: every key must stay above the target before a new one is added.">
          <LearnChoices k="recoverKeys" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="natural words" description="Use real words when enough of them fit the unlocked letters; otherwise pronounceable pseudo-words.">
          <LearnChoices k="naturalWords" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="keyboard order" description="Unlock keys home row first, instead of by how common the letter is.">
          <LearnChoices k="keyboardOrder" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="lesson length" description="Characters per lesson, from about 100 to 200.">
          <LearnChoices k="length" values={[0, 0.5, 1]} label={(v) => (v === 0 ? "short" : v === 1 ? "long" : "medium")} />
        </Setting>
        <Setting icon={faSeedling} title="capital letters" description="How often a word starts with a capital.">
          <LearnChoices k="capitals" values={[0, 0.1, 0.25, 0.5]} label={pct} />
        </Setting>
        <Setting icon={faSeedling} title="punctuation" description="How often a word gets punctuation.">
          <LearnChoices k="punctuators" values={[0, 0.1, 0.25, 0.5]} label={pct} />
        </Setting>
        <Setting icon={faSeedling} title="repeat words" description="Type each word this many times in a row.">
          <LearnChoices k="repeatWords" values={[1, 2, 3]} />
        </Setting>
        <Setting icon={faSeedling} title="daily goal" description="Minutes of practice to aim for each day.">
          <LearnChoices k="dailyGoal" values={[0, 10, 20, 30, 60]} label={(v) => (v ? `${v} min` : "off")} />
        </Setting>
        <Setting icon={faSeedling} title="stop on error" description="The cursor waits until you press the right key. Off: wrong letters pile up and must be deleted.">
          <LearnChoices k="stopOnError" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="forgive errors" description="Recover automatically when you replace or skip a single character.">
          <LearnChoices k="forgiveErrors" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="space skips words" description="Pressing space in the middle of a word jumps to the next one (the rest counts as missed).">
          <LearnChoices k="spaceSkipsWords" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="keyboard" description="Show the on-screen keyboard with the next key and each key's speed.">
          <LearnChoices k="showKeyboard" values={[false, true]} label={(v) => (v ? "show" : "hide")} />
        </Setting>
        <Setting icon={faSeedling} title="common words" description="How many of the most common words to draw from, and whether to skip short ones.">
          <div className="grid w-full gap-2">
            <LearnChoices k="wordListSize" values={[100, 250, 500, 1000, 5000]} />
            <LearnChoices k="longWordsOnly" values={[false, true]} label={(v) => (v ? "long words only" : "all words")} />
          </div>
        </Setting>
        <Setting icon={faSeedling} title="numbers" description="Leading digits follow Benford's law, like real-world numbers.">
          <LearnChoices k="benford" values={[false, true]} label={onOff} />
        </Setting>
        <Setting icon={faSeedling} title="custom text" description="Text for the custom text lesson." full>
          <textarea
            defaultValue={s.learn.customText}
            onBlur={(e) => setSetting("learn", { ...getSettings().learn, customText: e.target.value })}
            className="h-28 w-full resize-y rounded-(--roundness) border-0 bg-sub-alt p-3 text-sm text-text caret-caret outline-none"
          />
          <LearnChoices k="customRandomize" values={[false, true]} label={(v) => (v ? "random order" : "in order")} />
        </Setting>
      </section>

      <section className="grid gap-8">
        <h2 className="text-2xl text-sub">danger zone</h2>
        <Setting icon={faTrash} title="reset settings" description="Put every setting back to its default.">
          <Button
            text="reset settings"
            className="w-full"
            onClick={() => {
              if (!confirm("Reset all settings?")) return;
              for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) setSetting(k as keyof Settings, v as never);
              applyTheme(DEFAULT_SETTINGS.theme);
            }}
          />
        </Setting>
        <Setting icon={faTrash} title="clear history" description="Delete your saved test results and course progress from this browser.">
          <Button
            text="clear history"
            className="w-full"
            onClick={async () => {
              if (!confirm("Delete all results and course progress?")) return;
              await db().tests.clear();
              await db().drillBests.clear();
              await db().results.clear();
            }}
          />
        </Setting>
      </section>
    </div>
  );
}
