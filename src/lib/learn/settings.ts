// Settings for the adaptive learning path (keybr's lessonProps and
// textInputProps). Kept free of imports so the settings store can use it
// without pulling the model code into every page.

export type LessonType = "guided" | "words" | "numbers" | "custom" | "books";

export interface LearnSettings {
  type: LessonType;
  /** Target speed, characters per minute (keybr default 175 = 35 wpm). */
  targetSpeed: number;
  /** 0..1: how many extra keys to force in beyond the minimum six. */
  alphabetSize: number;
  /** Require keys to *stay* above target (true) or to have reached it once. */
  recoverKeys: boolean;
  /** Mix real dictionary words in with pseudo-words. */
  naturalWords: boolean;
  /** Unlock keys in keyboard order (home row first) instead of frequency. */
  keyboardOrder: boolean;
  /** 0..1: lesson length, 100 → 200 characters. */
  length: number;
  /** 0..1 probability of a capitalised word. */
  capitals: number;
  /** 0..1 probability of punctuation around a word. */
  punctuators: number;
  /** Repeat each word this many times. */
  repeatWords: number;
  /** Daily goal, minutes (0 = off). */
  dailyGoal: number;
  /** Text input: the cursor waits for the right key. */
  stopOnError: boolean;
  /** Text input: recover from a replaced or skipped character. */
  forgiveErrors: boolean;
  /** Text input: space jumps to the next word. */
  spaceSkipsWords: boolean;
  wordListSize: number;
  longWordsOnly: boolean;
  benford: boolean;
  customText: string;
  customRandomize: boolean;
  showKeyboard: boolean;
}

export const DEFAULT_LEARN: LearnSettings = {
  type: "guided",
  targetSpeed: 175,
  alphabetSize: 0,
  recoverKeys: false,
  naturalWords: true,
  keyboardOrder: false,
  length: 0,
  capitals: 0,
  punctuators: 0,
  repeatWords: 1,
  dailyGoal: 30,
  stopOnError: true,
  forgiveErrors: true,
  spaceSkipsWords: false,
  wordListSize: 1000,
  longWordsOnly: false,
  benford: true,
  customText: "The quick brown fox jumps over the lazy dog.",
  customRandomize: false,
  showKeyboard: true,
};
