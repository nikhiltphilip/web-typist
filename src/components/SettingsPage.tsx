"use client";

import {
  faCircleHalfStroke,
  faFont,
  faGraduationCap,
  faGaugeHigh,
  faICursor,
  faTextHeight,
  faTrash,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, FONTS, setSetting, useSettings, type Settings } from "@/lib/settings";
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
            }}
          />
        </Setting>
      </section>
    </div>
  );
}
