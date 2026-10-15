"use client";

import { CodeIcon, FileTextIcon, PaletteIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { openPalette } from "@/lib/focus";
import { useSettings } from "@/lib/settings";
import { Button, Kbd, LinkButton } from "./ui";

function Keytips() {
  const pathname = usePathname();
  const inCourse = pathname.startsWith("/courses/");
  return (
    <div className="hide-on-focus mb-8 text-center leading-[2]">
      {inCourse ? (
        <>
          <Kbd>enter</Kbd> - continue · <Kbd>esc</Kbd> - skip / restart exercise
          <br />
          <Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>p</Kbd> - command line
        </>
      ) : (
        <>
          <Kbd>tab</Kbd> + <Kbd>enter</Kbd> - restart test
          <br />
          <Kbd>esc</Kbd> or <Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>p</Kbd> - command line
        </>
      )}
    </div>
  );
}

export function Footer() {
  const { theme } = useSettings();
  return (
    <footer className="relative text-xs text-sub">
      <Keytips />
      <div className="hide-on-focus -m-2 flex justify-between gap-8">
        <div className="grid grid-cols-1 justify-items-start xs:grid-cols-2 sm:grid-cols-4 lg:flex">
          <LinkButton href="https://github.com/monkeytypegame/monkeytype" external icon={CodeIcon} text="monkeytype" />
          <LinkButton href="https://github.com/alexei-matveev/gtypist" external icon={CodeIcon} text="gnu typist" />
          <LinkButton href="/about" icon={FileTextIcon} text="license" />
        </div>
        <div className="flex flex-col items-end text-right lg:flex-row">
          <Button variant="text" icon={PaletteIcon} text={theme.replace(/_/g, " ")} onClick={() => openPalette("themes")} />
        </div>
      </div>
    </footer>
  );
}
