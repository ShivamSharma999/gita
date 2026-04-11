import { UIDirection } from "./types";

export const DATA_PATHS: Record<string, string> = {
  chapters: "data/chapters.json",
  verses: "data/verse.json",
  translations: "data/translation.json",
  languages: "data/languages.json",
  ui_translations: "data/ui_translation.json",
};

export const PREFERRED_AUTHORS: Record<UIDirection, string> = {
  english: "Swami Sivananda",
  hindi: "Swami Ramsukhdas",
};

export const VERSE_AUDIO_BASE_URL = "https://raw.githubusercontent.com/gita/gita/main/data/verse_recitation";
