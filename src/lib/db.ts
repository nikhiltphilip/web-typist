"use client";

// Local-first persistence in IndexedDB: free-test history, and per-drill
// personal bests / completion for courses.

import Dexie, { type EntityTable } from "dexie";

export interface TestRecord {
  id?: number;
  at: number;
  mode: string;
  mode2: string;
  wpm: number;
  raw: number;
  acc: number;
  consistency: number;
  durationMs: number;
}

export interface DrillBest {
  /** `${courseId}:${stmtIndex}` */
  key: string;
  courseId: string;
  stmt: number;
  wpm: number;
  acc: number;
  at: number;
}

class TypistDB extends Dexie {
  tests!: EntityTable<TestRecord, "id">;
  drillBests!: EntityTable<DrillBest, "key">;

  constructor() {
    super("monkey-typist");
    this.version(1).stores({
      tests: "++id, at, mode",
      drillBests: "key, courseId",
    });
  }
}

let instance: TypistDB | null = null;
export function db(): TypistDB {
  instance ??= new TypistDB();
  return instance;
}

/** Saves a passed drill; returns the previous best wpm (or null if first pass). */
export async function recordDrillPass(courseId: string, stmt: number, wpm: number, acc: number): Promise<number | null> {
  const key = `${courseId}:${stmt}`;
  try {
    const prev = await db().drillBests.get(key);
    if (!prev || wpm > prev.wpm) await db().drillBests.put({ key, courseId, stmt, wpm, acc, at: Date.now() });
    return prev?.wpm ?? null;
  } catch {
    return null;
  }
}

export async function passedDrills(courseId: string): Promise<Map<number, DrillBest>> {
  try {
    const rows = await db().drillBests.where("courseId").equals(courseId).toArray();
    return new Map(rows.map((r) => [r.stmt, r]));
  } catch {
    return new Map();
  }
}

export async function saveTest(rec: Omit<TestRecord, "id">): Promise<void> {
  try {
    await db().tests.add(rec);
  } catch {
    // private mode / storage blocked: results just aren't kept
  }
}

export async function bestFor(mode: string, mode2: string): Promise<number | null> {
  try {
    const rows = await db().tests.where("mode").equals(mode).toArray();
    const same = rows.filter((r) => r.mode2 === mode2);
    return same.length ? Math.max(...same.map((r) => r.wpm)) : null;
  } catch {
    return null;
  }
}

/** Number of distinct drills passed, per course. */
export async function progressByCourse(): Promise<Map<string, number>> {
  try {
    const rows = await db().drillBests.toArray();
    const out = new Map<string, number>();
    for (const r of rows) out.set(r.courseId, (out.get(r.courseId) ?? 0) + 1);
    return out;
  } catch {
    return new Map();
  }
}
