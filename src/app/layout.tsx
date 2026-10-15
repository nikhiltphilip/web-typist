import type { Metadata } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { AppShell } from "@/components/AppShell";
import { APP_NAME, STORAGE_KEY } from "@/lib/brand";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import "./globals.css";

config.autoAddCss = false;

export const metadata: Metadata = {
  title: `${APP_NAME} | a minimal typing test and touch typing courses`,
  description: "A minimal, customizable typing test with the full GNU Typist touch typing courses.",
};

// Paint the saved theme and font before React hydrates, so there is no flash
// of the default palette.
const prePaint = `(function(){try{
var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}");
var T=${JSON.stringify(THEMES)};var n=T[s.theme]?s.theme:${JSON.stringify(DEFAULT_THEME)};var t=T[n];
var r=document.documentElement;r.dataset.theme=n;
var m={bg:"--bg-color",caret:"--caret-color",main:"--main-color",sub:"--sub-color",subAlt:"--sub-alt-color",text:"--text-color",error:"--error-color",errorExtra:"--error-extra-color",colorfulError:"--colorful-error-color",colorfulErrorExtra:"--colorful-error-extra-color"};
for(var k in m)r.style.setProperty(m[k],t[k]);
if(s.font)r.style.setProperty("--font",'"'+s.font+'", "Roboto Mono", monospace');
}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
        <link rel="preload" href="/fonts/RobotoMono-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/LexendDeca-Regular.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
