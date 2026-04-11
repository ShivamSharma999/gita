import { GlobalState, UIDirection } from "./types";
import { dom } from "./dom";
import { PREFERRED_AUTHORS } from "./constants";

export let UI_TEXT: Record<string, any> = {};

export const state: GlobalState = {
  chapters: [],
  verses: [],
  translationMap: new Map(),
  chapterByNumber: new Map(),
  verseById: new Map(),
  languages: [],
  translationEntryCount: 0,
  uiLanguage: "english",
  currentSection: "home",
  chapterSearch: "",
  verseSearch: "",
  selectedChapter: "all",
  currentPage: 1,
  pageSize: 12,
  dailyQuoteVerseId: null,
  activeAudioKey: null,
  audioStatus: "idle",
  audioErrorKey: null,
};

export function loadJson(path: string): Promise<any> {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`${path} (${response.status})`);
    }
    return response.json();
  });
}

export function computeDailyQuoteVerseId() {
  if (!state.verses.length) {
    return null;
  }
  const today = new Date();
  const seed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  const verseIndex = Math.abs(hash) % state.verses.length;
  return state.verses[verseIndex].id;
}
export function buildTranslationMap(translations: any[]) {
  const grouped = new Map<number, any>();

  translations.forEach((entry) => {
    const verseId = Number(entry.verse_id);
    if (!grouped.has(verseId)) {
      grouped.set(verseId, {
        englishOptions: [],
        hindiOptions: [],
      });
    }

    const bucket = grouped.get(verseId);
    const normalizedLang = String(entry.lang || "").toLowerCase();
    const data = {
      author: cleanText(entry.authorName),
      text: cleanText(entry.description),
    };

    if (normalizedLang === "english") {
      bucket.englishOptions.push(data);
    } else if (normalizedLang === "hindi") {
      bucket.hindiOptions.push(data);
    }
  });

  const mapped = new Map<number, any>();
  grouped.forEach((value, verseId) => {
    mapped.set(verseId, {
      english: chooseTranslation(value.englishOptions, "english" as any),
      hindi: chooseTranslation(value.hindiOptions, "hindi" as any),
    });
  });

  return mapped;
}
export function chooseTranslation(options: any[], language: UIDirection) {
  if (!options || !options.length) {
    return null;
  }
  const preferred = options.find((item) => item.author === PREFERRED_AUTHORS[language]);
  return preferred || options[0];
}

export function getTranslation(verseId: number, language: UIDirection) {
  const row = state.translationMap.get(verseId);
  if (!row) {
    return null;
  }
  return row[language] || null;
}

export function restorePreferences() {
  const savedLanguage = localStorage.getItem("gita-ui-language");
  if (savedLanguage === "english" || savedLanguage === "hindi") {
    state.uiLanguage = savedLanguage;
  }
}

export function showFatalError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const errorText = t("loadError");
  dom.loadingScreen.classList.remove("hidden");
  dom.loadingScreen.innerHTML = `
    <div class="loading-card" style="max-width: 560px; flex-direction: column; align-items: flex-start;">
      <p style="margin:0; font-weight:700;">${escapeHtml(errorText)}</p>
      <p style="margin:0; color:#5f6a74;">${escapeHtml(message)}</p>
    </div>
  `;
}

export function hideLoading() {
  dom.loadingScreen.classList.add("hidden");
}

export function t(key: string, vars: Record<string, unknown> = {}): string {
  const capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const source = UI_TEXT[state.uiLanguage] || UI_TEXT.english || {};
  const fallback = UI_TEXT.english || {};
  const template = source[key] ?? fallback[key] ?? key.replace(/(.)/g, (x) => capitals.includes(x) ? ' ' + x.toLowerCase() : x).replace(key[0], key[0].toUpperCase());
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, variable) => String(vars[variable] ?? ""));
}

export function chapterTitle(chapter: any, language: UIDirection) {
  if (language === "hindi") {
    return chapter.name || chapter.name_translation || "";
  }
  return chapter.name_translation || chapter.name_transliterated || chapter.name || "";
}

export function languageName(language: UIDirection) {
  if (language === "hindi") {
    return t("nameHindi");
  }
  return t("nameEnglish");
}

export function getSecondaryLanguage(language: UIDirection): UIDirection {
  return language === "english" ? "hindi" : "english";
}

export function getLocale() {
  return state.uiLanguage === "hindi" ? "hi-IN" : "en-US";
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(getLocale()).format(value);
}

export function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(value: string, maxLength: number) {
  const text = cleanText(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
