import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { CourseRunner } from "@/components/course/CourseRunner";
import courses from "@/data/courses.json";
import type { CourseScript } from "@/lib/course/types";

export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!courses.some((c) => c.id === id)) notFound();
  const file = path.join(process.cwd(), "public", "courses", `${id}.json`);
  const script = JSON.parse(await fs.readFile(file, "utf8")) as CourseScript;
  return <CourseRunner key={id} script={script} />;
}
