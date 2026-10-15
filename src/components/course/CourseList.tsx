"use client";

import { ChartLineIcon, GraduationCapIcon, SproutIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import courses from "@/data/courses.json";
import type { CourseMeta } from "@/lib/course/types";
import { progressByCourse } from "@/lib/db";
import { Icon } from "../ui";

const all = courses as CourseMeta[];

function Bar({ value }: { value: number }) {
  return (
    <div className="h-[0.35rem] w-full overflow-hidden rounded-full bg-bg">
      <div className="h-full rounded-full bg-main transition-[width] duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function CourseList() {
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    progressByCourse().then(setProgress);
  }, []);

  const groups = [...new Set(all.map((c) => c.group))];

  return (
    <div className="grid content-start gap-12 fade-in">
      <div className="grid gap-2">
        <h2 className="flex items-center gap-2 text-2xl text-sub">
          <Icon icon={GraduationCapIcon} /> courses
        </h2>
        <p className="max-w-[70ch] leading-relaxed text-sub">
          The complete GNU Typist lesson library. Each course teaches the keyboard step by step: read the tutorial, then type each drill.
          Press <kbd>enter</kbd> at the end of every line. If your error rate is above the limit (3% unless the lesson sets another),
          you repeat the drill.
        </p>
      </div>
      <section className="grid gap-4">
        <h3 className="text-sm text-sub">adaptive · keybr learning path</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/learn" className="group grid gap-3 rounded-(--roundness) bg-sub-alt p-4 transition-colors duration-125 hover:bg-text">
            <div className="flex items-center gap-2 text-text group-hover:text-bg">
              <Icon icon={SproutIcon} /> Adaptive learning path
            </div>
            <div className="text-xs leading-relaxed text-sub group-hover:text-bg">
              Starts with six letters and adds the next one once every key you know is above your target speed. Each lesson is
              generated for your weakest key.
            </div>
          </Link>
          <Link href="/analytics" className="group grid gap-3 rounded-(--roundness) bg-sub-alt p-4 transition-colors duration-125 hover:bg-text">
            <div className="flex items-center gap-2 text-text group-hover:text-bg">
              <Icon icon={ChartLineIcon} /> Typing analytics
            </div>
            <div className="text-xs leading-relaxed text-sub group-hover:text-bg">
              Speed and accuracy over time, per-key speed and learning progress, a keyboard heatmap and a practice calendar.
            </div>
          </Link>
        </div>
      </section>
      {groups.map((g) => (
        <section key={g} className="grid gap-4">
          <h3 className="text-sm text-sub">{g}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {all
              .filter((c) => c.group === g)
              .map((c) => {
                const done = progress.get(c.id) ?? 0;
                return (
                  <Link
                    key={c.id}
                    href={`/courses/${c.id}`}
                    className="group grid gap-3 rounded-(--roundness) bg-sub-alt p-4 transition-colors duration-125 hover:bg-text"
                  >
                    <div className="text-text group-hover:text-bg">{c.title}</div>
                    <div className="text-xs text-sub group-hover:text-bg">{c.description}</div>
                    <div className="flex items-center gap-3 text-xs text-sub group-hover:text-bg">
                      <Bar value={c.scored ? done / c.scored : 0} />
                      <span className="whitespace-nowrap">
                        {done}/{c.scored}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
