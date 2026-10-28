// Theme palettes taken from Monkeytype (frontend/src/ts/constants/themes.ts, GPL-3.0).
// Each theme is just these colour variables; see applyTheme().

export interface Theme {
  bg: string;
  caret: string;
  main: string;
  sub: string;
  subAlt: string;
  text: string;
  error: string;
  errorExtra: string;
  colorfulError: string;
  colorfulErrorExtra: string;
}

export const DEFAULT_THEME = "fuyu";

export const THEMES: Record<string, Theme> = {
  fuyu: { bg: "#20252f", caret: "#a1d6fd", main: "#a1d6fd", sub: "#89919d", subAlt: "#141923", text: "#dbe3f1", error: "#f1b8b6", errorExtra: "#febbba", colorfulError: "#f1b8b6", colorfulErrorExtra: "#febbba" },
  catppuccin: { bg: "#1e1e2e", caret: "#f2cdcd", main: "#cba6f7", sub: "#7f849c", subAlt: "#181825", text: "#cdd6f4", error: "#f38ba8", errorExtra: "#eba0ac", colorfulError: "#f38ba8", colorfulErrorExtra: "#eba0ac" },
  "8008": { bg: "#333a45", caret: "#f44c7f", main: "#f44c7f", sub: "#939eae", subAlt: "#2e343d", text: "#e9ecf0", error: "#da3333", errorExtra: "#791717", colorfulError: "#c5da33", colorfulErrorExtra: "#849224" },
  alduin: { bg: "#1c1c1c", caret: "#e3e3e3", main: "#dfd7af", sub: "#444444", subAlt: "#242424", text: "#f5f3ed", error: "#af5f5f", errorExtra: "#4d2113", colorfulError: "#af5f5f", colorfulErrorExtra: "#4d2113" },
  bento: { bg: "#2d394d", caret: "#ff7a90", main: "#ff7a90", sub: "#4a768d", subAlt: "#263041", text: "#fffaf8", error: "#ee2a3a", errorExtra: "#f04040", colorfulError: "#fc2032", colorfulErrorExtra: "#f04040" },
  botanical: { bg: "#7b9c98", caret: "#abc6c4", main: "#eaf1f3", sub: "#495755", subAlt: "#72908d", text: "#eaf1f3", error: "#f6c9b4", errorExtra: "#f59a71", colorfulError: "#f6c9b4", colorfulErrorExtra: "#f59a71" },
  bushido: { bg: "#242933", caret: "#ec4c56", main: "#ec4c56", sub: "#596172", subAlt: "#1c222d", text: "#f6f0e9", error: "#ec4c56", errorExtra: "#9b333a", colorfulError: "#ecdc4c", colorfulErrorExtra: "#bdb03d" },
  carbon: { bg: "#313131", caret: "#f66e0d", main: "#f66e0d", sub: "#616161", subAlt: "#2b2b2b", text: "#f5e6c8", error: "#e72d2d", errorExtra: "#7e2a33", colorfulError: "#e72d2d", colorfulErrorExtra: "#7e2a33" },
  dark: { bg: "#111", caret: "#eee", main: "#eee", sub: "#444", subAlt: "#191919", text: "#eee", error: "#da3333", errorExtra: "#791717", colorfulError: "#da3333", colorfulErrorExtra: "#791717" },
  dracula: { bg: "#282a36", caret: "#bd93f9", main: "#bd93f9", sub: "#6272a4", subAlt: "#20222c", text: "#f8f8f2", error: "#ff5555", errorExtra: "#f1fa8c", colorfulError: "#ff5555", colorfulErrorExtra: "#f1fa8c" },
  github: { bg: "#212830", caret: "#41ce5c", main: "#41ce5c", sub: "#788386", subAlt: "#141b23", text: "#ccdae6", error: "#c23e3a", errorExtra: "#c23e3a", colorfulError: "#c23e3a", colorfulErrorExtra: "#c23e3a" },
  gruvbox_dark: { bg: "#282828", caret: "#fabd2f", main: "#d79921", sub: "#665c54", subAlt: "#212121", text: "#ebdbb2", error: "#fb4934", errorExtra: "#cc241d", colorfulError: "#cc241d", colorfulErrorExtra: "#9d0006" },
  gruvbox_light: { bg: "#fbf1c7", caret: "#689d6a", main: "#689d6a", sub: "#a89984", subAlt: "#daceae", text: "#3c3836", error: "#cc241d", errorExtra: "#9d0006", colorfulError: "#cc241d", colorfulErrorExtra: "#9d0006" },
  iceberg_dark: { bg: "#161821", caret: "#d2d4de", main: "#84a0c6", sub: "#595e76", subAlt: "#232531", text: "#c6c8d1", error: "#e27878", errorExtra: "#e2a478", colorfulError: "#e27878", colorfulErrorExtra: "#e2a478" },
  iceberg_light: { bg: "#e8e9ec", caret: "#262a3f", main: "#2d539e", sub: "#adb1c4", subAlt: "#ccceda", text: "#33374c", error: "#cc517a", errorExtra: "#cc3768", colorfulError: "#cc517a", colorfulErrorExtra: "#cc3768" },
  laser: { bg: "#221b44", caret: "#009eaf", main: "#009eaf", sub: "#b82356", subAlt: "#1e173b", text: "#dbe7e8", error: "#a8d400", errorExtra: "#668000", colorfulError: "#a8d400", colorfulErrorExtra: "#668000" },
  lavender: { bg: "#ada6c2", caret: "#e4e3e9", main: "#e4e3e9", sub: "#e4e3e9", subAlt: "#a19bb9", text: "#2f2a41", error: "#ca4754", errorExtra: "#7e2a33", colorfulError: "#ca4754", colorfulErrorExtra: "#7e2a33" },
  matrix: { bg: "#000000", caret: "#15ff00", main: "#15ff00", sub: "#006500", subAlt: "#032000", text: "#d1ffcd", error: "#da3333", errorExtra: "#791717", colorfulError: "#da3333", colorfulErrorExtra: "#791717" },
  miami_nights: { bg: "#18181a", caret: "#e4609b", main: "#e4609b", sub: "#47bac0", subAlt: "#0f0f10", text: "#fff", error: "#fff591", errorExtra: "#b6af68", colorfulError: "#fff591", colorfulErrorExtra: "#b6af68" },
  mizu: { bg: "#afcbdd", caret: "#fcfbf6", main: "#fcfbf6", sub: "#85a5bb", subAlt: "#9fc1d4", text: "#1a2633", error: "#bf616a", errorExtra: "#793e44", colorfulError: "#bf616a", colorfulErrorExtra: "#793e44" },
  modern_ink: { bg: "#ffffff", caret: "#ff0000", main: "#ff360d", sub: "#b7b7b7", subAlt: "#ececec", text: "#000000", error: "#d70000", errorExtra: "#b00000", colorfulError: "#000000", colorfulErrorExtra: "#000000" },
  monokai: { bg: "#272822", caret: "#66d9ef", main: "#a6e22e", sub: "#e6db74", subAlt: "#1f201b", text: "#e2e2dc", error: "#f92672", errorExtra: "#fd971f", colorfulError: "#f92672", colorfulErrorExtra: "#fd971f" },
  nautilus: { bg: "#132237", caret: "#ebb723", main: "#ebb723", sub: "#0b4c6c", subAlt: "#0e1a29", text: "#1cbaac", error: "#da3333", errorExtra: "#791717", colorfulError: "#da3333", colorfulErrorExtra: "#791717" },
  nord: { bg: "#242933", caret: "#eceff4", main: "#88c0d0", sub: "#929aaa", subAlt: "#2e3440", text: "#d8dee9", error: "#bf616a", errorExtra: "#793e44", colorfulError: "#bf616a", colorfulErrorExtra: "#793e44" },
  olivia: { bg: "#1c1b1d", caret: "#deaf9d", main: "#deaf9d", sub: "#4e3e3e", subAlt: "#262223", text: "#f2efed", error: "#bf616a", errorExtra: "#793e44", colorfulError: "#e03d4e", colorfulErrorExtra: "#aa2f3b" },
  paper: { bg: "#eeeeee", caret: "#444444", main: "#444444", sub: "#b2b2b2", subAlt: "#dddddd", text: "#444444", error: "#d70000", errorExtra: "#d70000", colorfulError: "#d70000", colorfulErrorExtra: "#d70000" },
  rose_pine: { bg: "#1f1d27", caret: "#f6c177", main: "#9ccfd8", sub: "#c4a7e7", subAlt: "#282533", text: "#e0def4", error: "#eb6f92", errorExtra: "#ebbcba", colorfulError: "#eb6f92", colorfulErrorExtra: "#ebbcba" },
  rose_pine_dawn: { bg: "#fffaf3", caret: "#ea9d34", main: "#56949f", sub: "#c4a7e7", subAlt: "#f0e9df", text: "#286983", error: "#b4637a", errorExtra: "#d7827e", colorfulError: "#b4637a", colorfulErrorExtra: "#d7827e" },
  rose_pine_moon: { bg: "#2a273f", caret: "#f6c177", main: "#9ccfd8", sub: "#c4a7e7", subAlt: "#211f32", text: "#e0def4", error: "#eb6f92", errorExtra: "#ebbcba", colorfulError: "#eb6f92", colorfulErrorExtra: "#ebbcba" },
  serika: { bg: "#e1e1e3", caret: "#e2b714", main: "#e2b714", sub: "#aaaeb3", subAlt: "#d1d3d8", text: "#323437", error: "#da3333", errorExtra: "#791717", colorfulError: "#da3333", colorfulErrorExtra: "#791717" },
  serika_dark: { bg: "#323437", caret: "#e2b714", main: "#e2b714", sub: "#646669", subAlt: "#2c2e31", text: "#d1d0c5", error: "#ca4754", errorExtra: "#7e2a33", colorfulError: "#ca4754", colorfulErrorExtra: "#7e2a33" },
  shadow: { bg: "#000", caret: "#eee", main: "#eee", sub: "#444", subAlt: "#171717", text: "#eee", error: "#fff", errorExtra: "#d8d8d8", colorfulError: "#fff", colorfulErrorExtra: "#d8d8d8" },
  solarized_dark: { bg: "#002b36", caret: "#dc322f", main: "#859900", sub: "#2aa198", subAlt: "#00222b", text: "#268bd2", error: "#d33682", errorExtra: "#9b225c", colorfulError: "#d33682", colorfulErrorExtra: "#9b225c" },
  solarized_light: { bg: "#fdf6e3", caret: "#dc322f", main: "#859900", sub: "#2aa198", subAlt: "#e2d8be", text: "#181819", error: "#d33682", errorExtra: "#9b225c", colorfulError: "#d33682", colorfulErrorExtra: "#9b225c" },
  sonokai: { bg: "#2c2e34", caret: "#f38c71", main: "#9ed072", sub: "#e7c664", subAlt: "#232429", text: "#e2e2e3", error: "#fc5d7c", errorExtra: "#ecac6a", colorfulError: "#fc5d7c", colorfulErrorExtra: "#ecac6a" },
  vscode: { bg: "#1e1e1e", caret: "#569cd6", main: "#007acc", sub: "#4d4d4d", subAlt: "#191919", text: "#d4d4d4", error: "#f44747", errorExtra: "#f44747", colorfulError: "#f44747", colorfulErrorExtra: "#f44747" },
};

export const THEME_NAMES = Object.keys(THEMES);

const VARS: [keyof Theme, string][] = [
  ["bg", "--bg-color"],
  ["caret", "--caret-color"],
  ["main", "--main-color"],
  ["sub", "--sub-color"],
  ["subAlt", "--sub-alt-color"],
  ["text", "--text-color"],
  ["error", "--error-color"],
  ["errorExtra", "--error-extra-color"],
  ["colorfulError", "--colorful-error-color"],
  ["colorfulErrorExtra", "--colorful-error-extra-color"],
];

export function applyTheme(name: string): void {
  const theme = THEMES[name] ?? THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  for (const [key, cssVar] of VARS) root.style.setProperty(cssVar, theme[key]);
  root.dataset.theme = name in THEMES ? name : DEFAULT_THEME;
}
