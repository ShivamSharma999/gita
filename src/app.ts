import { DATA_PATHS } from "./constants";
import {
  state,
  UI_TEXT,
  loadJson,
  restorePreferences,
  computeDailyQuoteVerseId,
  buildTranslationMap,
  hideLoading,
  showFatalError,
} from "./state";
import { applyUiLanguage, bindEvents } from "./events";
import { configureVerseAudioPlayer } from "./audio";
import { populateChapterFilter, renderAll } from "./render";

async function init() {
  try {
    const [chapters, verses, translations, languages, langData] =
      await Promise.all([
        loadJson(DATA_PATHS.chapters),
        loadJson(DATA_PATHS.verses),
        loadJson(DATA_PATHS.translations),
        loadJson(DATA_PATHS.languages),
        loadJson(DATA_PATHS.ui_translations),
      ]);

    Object.assign(UI_TEXT, langData);

    restorePreferences();
    applyUiLanguage();
    bindEvents();
    configureVerseAudioPlayer();

    state.chapters = Array.isArray(chapters)
      ? chapters.map((chapter: any) => ({
          ...chapter,
          chapter_number: Number(chapter.chapter_number),
          verses_count: Number(chapter.verses_count),
        }))
      : [];

    state.verses = Array.isArray(verses)
      ? verses.map((verse: any) => ({
          ...verse,
          id: Number(verse.id),
          chapter_number: Number(verse.chapter_number),
          verse_number: Number(verse.verse_number),
          verse_order: Number(verse.verse_order),
        }))
      : [];

    state.chapters.sort((a, b) => a.chapter_number - b.chapter_number);
    state.verses.sort((a, b) => a.verse_order - b.verse_order);

    state.chapterByNumber = new Map(
      state.chapters.map((chapter) => [chapter.chapter_number, chapter]),
    );
    state.verseById = new Map(state.verses.map((verse) => [verse.id, verse]));
    state.translationMap = buildTranslationMap(translations);
    state.languages = Array.isArray(languages) ? languages : [];
    state.translationEntryCount = Array.isArray(translations)
      ? translations.length
      : 0;
    state.dailyQuoteVerseId = computeDailyQuoteVerseId();

    populateChapterFilter();
    renderAll();
    hideLoading();
  } catch (error) {
    showFatalError(error);
  }
}

init();
