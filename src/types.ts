export type UIDirection = "english" | "hindi";

export interface Chapter {
  chapter_number: number;
  verses_count: number;
  chapter_name: string;
  [key: string]: any;
}

export interface Verse {
  id: number;
  chapter_number: number;
  verse_number: number;
  verse_order: number;
  [key: string]: any;
}

export interface GlobalState {
  chapters: Chapter[];
  verses: Verse[];
  translationMap: Map<number, any>;
  chapterByNumber: Map<number, Chapter>;
  verseById: Map<number, Verse>;
  languages: string[];
  translationEntryCount: number;
  uiLanguage: UIDirection;
  currentSection: string;
  chapterSearch: string;
  verseSearch: string;
  selectedChapter: string;
  currentPage: number;
  pageSize: number;
  dailyQuoteVerseId: number | null;
  activeAudioKey: string | null;
  audioStatus: "idle" | "playing" | "paused" | "loading" | "error";
  audioErrorKey: string | null;
}

export interface DomRefs {
  loadingScreen: HTMLElement;
  navItems: HTMLElement[];
  panels: HTMLElement[];
  langButtons: HTMLElement[];
  homeSpotlight: HTMLElement;
  chapterSearchInput: HTMLInputElement;
  chaptersGrid: HTMLElement;
  verseChapterFilter: HTMLSelectElement;
  verseSearchInput: HTMLInputElement;
  versePageSize: HTMLSelectElement;
  verseResultMeta: HTMLElement;
  versesList: HTMLElement;
  prevPageBtn: HTMLButtonElement;
  nextPageBtn: HTMLButtonElement;
  pageInfo: HTMLElement;
}
