"use strict";

const DATA_PATHS = {
  chapters: "data/chapters.json",
  verses: "data/verse.json",
  translations: "data/translation.json",
  languages: "data/languages.json",
  ui_translations: "data/ui_translation.json"
};

const PREFERRED_AUTHORS = {
  english: "Swami Sivananda",
  hindi: "Swami Ramsukhdas",
};

const VERSE_AUDIO_BASE_URL = "https://raw.githubusercontent.com/gita/gita/main/data/verse_recitation";

let UI_TEXT = {};

const state = {
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

const verseAudioPlayer = new Audio();
verseAudioPlayer.preload = "none";

const dom = {
  loadingScreen: document.getElementById("loadingScreen"),
  navItems: Array.from(document.querySelectorAll(".nav-item")),
  panels: Array.from(document.querySelectorAll(".panel")),
  langButtons: Array.from(document.querySelectorAll(".lang-btn")),
  homeSpotlight: document.getElementById("homeSpotlight"),
  chapterSearchInput: document.getElementById("chapterSearchInput"),
  chaptersGrid: document.getElementById("chaptersGrid"),
  verseChapterFilter: document.getElementById("verseChapterFilter"),
  verseSearchInput: document.getElementById("verseSearchInput"),
  versePageSize: document.getElementById("versePageSize"),
  verseResultMeta: document.getElementById("verseResultMeta"),
  versesList: document.getElementById("versesList"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageInfo: document.getElementById("pageInfo"),
};

function ev(to, events, listener) {
  const eventList = events.split(",");
  eventList.forEach(e => {
    to.addEventListener(e, listener);
  })
}

init();

async function init() {
  
  try {
    const [chapters, verses, translations, languages, langData] = [
      await loadJson(DATA_PATHS.chapters),
      await loadJson(DATA_PATHS.verses),
      await loadJson(DATA_PATHS.translations),
      await loadJson(DATA_PATHS.languages),
      await loadJson(DATA_PATHS.ui_translations),
    ];

    UI_TEXT = langData;
    Object.assign(UI_TEXT.hindi, {
      audioPlay: "श्लोक सुनें",
      audioPause: "पाठ रोकें",
      audioResume: "पाठ जारी रखें",
      audioLoading: "ऑडियो लोड हो रहा है...",
      audioRetry: "फिर से चलाएं",
      audioUnavailable: "इस श्लोक का ऑडियो अभी उपलब्ध नहीं है।",
    });

  restorePreferences();
  applyUiLanguage();
  syncControlStates();
  bindEvents();
  configureVerseAudioPlayer();
    state.chapters = chapters
      .map((chapter) => ({
        ...chapter,
        chapter_number: Number(chapter.chapter_number),
        verses_count: Number(chapter.verses_count),
      }))
      .sort((a, b) => a.chapter_number - b.chapter_number);

    state.verses = verses
      .map((verse) => ({
        ...verse,
        id: Number(verse.id),
        chapter_number: Number(verse.chapter_number),
        verse_number: Number(verse.verse_number),
        verse_order: Number(verse.verse_order),
      }))
      .sort((a, b) => a.verse_order - b.verse_order);

    state.chapterByNumber = new Map(state.chapters.map((chapter) => [chapter.chapter_number, chapter]));
    state.verseById = new Map(state.verses.map((verse) => [verse.id, verse]));
    state.translationMap = buildTranslationMap(translations);
    state.languages = Array.isArray(languages) ? languages : [];
    state.translationEntryCount = Array.isArray(translations) ? translations.length : 0;

    state.dailyQuoteVerseId = computeDailyQuoteVerseId();

    populateChapterFilter();
    renderAll();
    hideLoading();
  } catch (error) {
    showFatalError(error);
  }
}

function bindEvents() {
  dom.navItems.forEach((item) => {
    ev(item, "click", () => showSection(item.dataset.sectionTarget));
  });

  dom.langButtons.forEach((button) => {
    ev(button, "click", () => setLanguage(button.dataset.lang));
  });

  ev(dom.chapterSearchInput, "input", () => {
    state.chapterSearch = dom.chapterSearchInput.value.trim();
    renderChapters();
  });

  ev(dom.chaptersGrid, "click", (event) => {
    const chapterButton = event.target.closest("[data-open-chapter]");
    if (!chapterButton) {
      return;
    }
    const chapterNumber = chapterButton.dataset.openChapter;
    state.selectedChapter = chapterNumber;
    state.currentPage = 1;
    dom.verseChapterFilter.value = chapterNumber;
    showSection("verses");
    renderVerses();
  });

  ev(dom.verseChapterFilter, "change", () => {
    state.selectedChapter = dom.verseChapterFilter.value;
    state.currentPage = 1;
    renderVerses();
  });

  ev(dom.verseSearchInput, "input", () => {
    state.verseSearch = dom.verseSearchInput.value.trim();
    state.currentPage = 1;
    renderVerses();
  });

  ev(dom.versePageSize, "change", () => {
    state.pageSize = Number(dom.versePageSize.value);
    state.currentPage = 1;
    renderVerses();
  });

  ev(dom.prevPageBtn, "click", () => {
    if (state.currentPage <= 1) {
      return;
    }
    state.currentPage -= 1;
    renderVerses();
  });

  ev(dom.nextPageBtn, "click", () => {
    const filtered = getFilteredVerses();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.currentPage >= totalPages) {
      return;
    }
    state.currentPage += 1;
    renderVerses();
  });
  ev(document, "click", (event) => {
    const audioButton = event.target.closest("[data-audio-toggle]");
    if (!audioButton) {
      return;
    }
    toggleVerseAudio(audioButton);
  });

  ev(window, "keypress", (e) => {
    if(e.shiftKey && e.ctrlKey && e.key.toLowerCase() === "i") return e.preventDefault();
    if (e.key.toLowerCase() === "r" && e.ctrlKey) return e.preventDefault();
  });

  ev(window, "contextmenu", (e) => e.preventDefault());
}

function setLanguage(language) {
  if (!["english", "hindi"].includes(language)) {
    return;
  }
  state.uiLanguage = language;
  localStorage.setItem("gita-ui-language", language);
  applyUiLanguage();
  populateChapterFilter();
  renderAll();
}


function showSection(sectionName) {
  if (!sectionName) {
    return;
  }
  const previousSection = state.currentSection;
  state.currentSection = sectionName;

  if (previousSection !== sectionName && state.activeAudioKey) {
    verseAudioPlayer.pause();
    resetAudioState();
  }

  dom.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.sectionTarget === sectionName);
  });

  dom.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.section === sectionName);
  });

  runRevealForCurrentPanel();
}

function renderAll() {
  applyUiLanguage();
  renderHomeSpotlight();
  renderChapters();
  renderVerses();
  showSection(state.currentSection);
  syncAudioButtons();
}

function renderHomeSpotlight() {
  const dailyVerse = state.verseById.get(state.dailyQuoteVerseId);
  if (!dailyVerse) {
    dom.homeSpotlight.innerHTML = "";
    return;
  }
  const chapter = state.chapterByNumber.get(dailyVerse.chapter_number),
  verseTxt = dailyVerse.text,
  summary = getTranslation(dailyVerse.id, state.uiLanguage);

  dom.homeSpotlight.innerHTML = `
    <p class="verse-tag">${escapeHtml(t("homeSpotlightTitle"))}</p>
    <h3 class="verse-title">${escapeHtml(chapter ? chapterTitle(chapter, state.uiLanguage) : "")} • ${dailyVerse.verse_number}</h3>
    <p class="chapter-summary ${state.uiLanguage === "hindi" ? "dev-font" : ""}">
      ${escapeHtml(verseTxt)}<br>${escapeHtml(summary.text)}
    </p>
  `;
}

function renderChapters() {
  const query = state.chapterSearch.trim().toLowerCase();
  const chapters = state.chapters.filter((chapter) => {
    if (!query) {
      return true;
    }
    const haystack = [
      chapter.chapter_number,
      chapter.name,
      chapter.name_translation,
      chapter.name_transliterated,
      chapter.name_meaning,
      chapter.chapter_summary,
      chapter.chapter_summary_hindi,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  if (!chapters.length) {
    dom.chaptersGrid.innerHTML = `<article class="empty-state reveal is-visible">${escapeHtml(t("noChapterMatch"))}</article>`;
    return;
  }

  dom.chaptersGrid.innerHTML = chapters
    .map((chapter) => {
      const summary =
        state.uiLanguage === "hindi"
          ? chapter.chapter_summary_hindi || chapter.chapter_summary
          : chapter.chapter_summary;

      return `
        <article class="chapter-card reveal">
          <div class="chapter-top">
            <p class="chapter-number">${escapeHtml(t("chapterOnlyTag", { chapter: formatNumber(chapter.chapter_number) }))}</p>
            <p class="chapter-verse-count">${escapeHtml(t("chapterVerseCount", { count: formatNumber(chapter.verses_count) }))}</p>
          </div>
          <h3 class="chapter-name">${escapeHtml(chapterTitle(chapter, "english"))}</h3>
          <p class="chapter-devanagari dev-font">${escapeHtml(chapter.name)}</p>
          <p class="chapter-summary ${state.uiLanguage === "hindi" ? "dev-font" : ""}">${escapeHtml(truncate(summary, 240))}</p>
          <button class="btn btn-ghost" data-open-chapter="${chapter.chapter_number}">
            ${escapeHtml(t("chapterJump"))}
          </button>
        </article>
      `;
    })
    .join("");
    runRevealForCurrentPanel();
}

function renderVerses() {
  const filtered = getFilteredVerses();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }

  const startIndex = (state.currentPage - 1) * state.pageSize;
  const visibleVerses = filtered.slice(startIndex, startIndex + state.pageSize);

  if (
    state.currentSection === "verses" &&
    state.activeAudioKey &&
    !visibleVerses.some((verse) => getVerseAudioKey(verse) === state.activeAudioKey)
  ) {
    verseAudioPlayer.pause();
    resetAudioState();
  }

  dom.verseResultMeta.textContent = t("showingResults", {
    shown: formatNumber(visibleVerses.length),
    total: formatNumber(total),
  });

  if (!visibleVerses.length) {
    dom.versesList.innerHTML = `<article class="empty-state reveal is-visible">${escapeHtml(t("noVerseMatch"))}</article>`;
  } else {
    dom.versesList.innerHTML = visibleVerses
      .map((verse) => `<article class="verse-card reveal">${buildVerseHeaderMarkup(verse)}${buildVerseBodyMarkup(verse)}</article>`)
      .join("");
  }

  dom.pageInfo.textContent = t("pageInfo", {
    page: formatNumber(state.currentPage),
    pages: formatNumber(totalPages),
  });

  dom.prevPageBtn.disabled = state.currentPage <= 1;
  dom.nextPageBtn.disabled = state.currentPage >= totalPages;
  syncAudioButtons();
  runRevealForCurrentPanel();
}

function buildVerseHeaderMarkup(verse) {
  const chapter = state.chapterByNumber.get(verse.chapter_number);
  return `
    <header class="verse-head">
      <div>
        <p class="verse-tag">${escapeHtml(t("chapterTag", { chapter: formatNumber(verse.chapter_number), verse: formatNumber(verse.verse_number) }))}</p>
        <h3 class="verse-title">${escapeHtml(chapter ? chapterTitle(chapter, state.uiLanguage) : "")}</h3>
      </div>
      <span class="chapter-chip">${escapeHtml(chapter ? chapterTitle(chapter, "english") : "")}</span>
    </header>
  `;
}

function buildVerseBodyMarkup(verse) {
  const primaryLang = state.uiLanguage;
  const primaryTranslation = getTranslation(verse.id, primaryLang);

  return `
    <div class="sanskrit-box">
      <p class="dev-font">${escapeHtml(cleanText(verse.text))}</p>
    </div>
    ${buildVerseAudioMarkup(verse)}
    <div class="translation-grid">
      ${translationBlockMarkup(primaryLang, primaryTranslation, true)}
    </div>
  `;
}

function buildVerseAudioMarkup(verse) {
  const verseKey = getVerseAudioKey(verse);
  const isError = state.audioErrorKey === verseKey;

  return `
    <div class="verse-audio-control">
      <button
        class="btn btn-ghost verse-audio-btn"
        type="button"
        data-audio-toggle
        data-audio-key="${escapeHtml(verseKey)}"
        data-audio-url="${escapeHtml(buildVerseAudioUrl(verse))}"
      >
        ${escapeHtml(getAudioButtonLabel(verseKey))}
      </button>
      <p class="audio-state-note${isError ? " error" : ""}"${isError ? "" : " hidden"}>
        ${escapeHtml(t("audioUnavailable"))}
      </p>
    </div>
  `;
}

function configureVerseAudioPlayer() {
  ev(verseAudioPlayer, "playing", () => {
    if (!state.activeAudioKey) {
      return;
    }
    state.audioStatus = "playing";
    syncAudioButtons();
  });

  ev(verseAudioPlayer, "waiting", () => {
    if (!state.activeAudioKey) {
      return;
    }
    state.audioStatus = "loading";
    syncAudioButtons();
  });

  ev(verseAudioPlayer, "ended", () => {
    resetAudioState();
  });

  ev(verseAudioPlayer, "error", () => {
    if (!state.activeAudioKey) {
      return;
    }
    state.audioStatus = "error";
    state.audioErrorKey = state.activeAudioKey;
    syncAudioButtons();
  });
}

async function toggleVerseAudio(button) {
  const verseKey = button.dataset.audioKey;
  const audioUrl = button.dataset.audioUrl;
  if (!verseKey || !audioUrl) {
    return;
  }

  const isActiveVerse = state.activeAudioKey === verseKey;
  const isPlaying = state.audioStatus === "playing" || state.audioStatus === "loading";

  if (isActiveVerse && isPlaying) {
    verseAudioPlayer.pause();
    state.audioStatus = "paused";
    syncAudioButtons();
    return;
  }

  if (isActiveVerse && state.audioStatus === "paused") {
    state.audioStatus = "loading";
    syncAudioButtons();
    try {
      await verseAudioPlayer.play();
    } catch (error) {
      handleAudioPlayError(verseKey, error);
    }
    return;
  }

  verseAudioPlayer.pause();

  state.activeAudioKey = verseKey;
  state.audioStatus = "loading";
  state.audioErrorKey = null;
  syncAudioButtons();

  verseAudioPlayer.src = audioUrl;
  verseAudioPlayer.currentTime = 0;

  try {
    await verseAudioPlayer.play();
  } catch (error) {
    handleAudioPlayError(verseKey, error);
  }
}

function handleAudioPlayError(verseKey, error) {
  if (state.activeAudioKey !== verseKey) {
    return;
  }
  state.audioStatus = "error";
  state.audioErrorKey = verseKey;
  syncAudioButtons();
  console.error("Verse recitation playback failed:", error);
}

function resetAudioState() {
  state.activeAudioKey = null;
  state.audioStatus = "idle";
  state.audioErrorKey = null;
  syncAudioButtons();
}

function syncAudioButtons() {
  const audioButtons = Array.from(document.querySelectorAll("[data-audio-toggle]"));

  audioButtons.forEach((button) => {
    const verseKey = button.dataset.audioKey;
    if (!verseKey) {
      return;
    }

    const isActive = state.activeAudioKey === verseKey;
    const isLoading = isActive && state.audioStatus === "loading";
    const showError = state.audioErrorKey === verseKey;

    button.textContent = getAudioButtonLabel(verseKey);
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute("aria-pressed", String(isActive && (state.audioStatus === "playing" || isLoading)));

    const wrapper = button.closest(".verse-audio-control");
    const note = wrapper ? wrapper.querySelector(".audio-state-note") : null;
    if (!note) {
      return;
    }
    note.textContent = t("audioUnavailable");
    note.hidden = !showError;
    note.classList.toggle("error", showError);
  });
}

function getAudioButtonLabel(verseKey) {
  if (state.audioErrorKey === verseKey) {
    return t("audioRetry");
  }
  if (state.activeAudioKey !== verseKey) {
    return t("audioPlay");
  }
  if (state.audioStatus === "loading") {
    return t("audioLoading");
  }
  if (state.audioStatus === "playing") {
    return t("audioPause");
  }
  return t("audioResume");
}

function getVerseAudioKey(verse) {
  return `${verse.chapter_number}:${verse.verse_number}`;
}

function buildVerseAudioUrl(verse) {
  return `${VERSE_AUDIO_BASE_URL}/${verse.chapter_number}/${verse.verse_number}.mp3`;
}

function translationBlockMarkup(language, entry, primary) {
  const translationText = entry?.text || t("translationMissing");
  const author = entry?.author || t("unknownAuthor");

  return `
    <div class="translation-block">
      <h4>${escapeHtml(primary ? t("translationPrimary") : t("translationSecondary"))} • ${escapeHtml(languageName(language))}</h4>
      <p class="${language === "hindi" ? "dev-font" : ""}">${escapeHtml(translationText)}</p>
      <p class="translator">${escapeHtml(`${t("translatorLabel")}: ${author}`)}</p>
    </div>
  `;
}

function getFilteredVerses() {
  const selectedChapter = state.selectedChapter;
  const searchQuery = state.verseSearch.trim().toLowerCase();
  const secondary = getSecondaryLanguage(state.uiLanguage);

  return state.verses.filter((verse) => {
    if (selectedChapter !== "all" && String(verse.chapter_number) !== selectedChapter) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const chapter = state.chapterByNumber.get(verse.chapter_number);
    const primaryTranslation = getTranslation(verse.id, state.uiLanguage)?.text || "";
    const secondaryTranslation = getTranslation(verse.id, secondary)?.text || "";

    const haystack = [
      verse.text,
      verse.transliteration,
      verse.word_meanings,
      primaryTranslation,
      secondaryTranslation,
      chapter ? chapter.name : "",
      chapter ? chapter.name_translation : "",
      chapter ? chapter.name_meaning : "",
      verse.chapter_number,
      verse.verse_number,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery);
  });
}

function populateChapterFilter() {
  if (!state.chapters.length) {
    dom.verseChapterFilter.innerHTML = `<option value="all">${escapeHtml(t("allChapters"))}</option>`;
    return;
  }

  const previousSelection = state.selectedChapter;
  const options = [
    `<option value="all">${escapeHtml(t("allChapters"))}</option>`,
    ...state.chapters.map((chapter) => {
      const label =
        state.uiLanguage === "hindi"
          ? `${formatNumber(chapter.chapter_number)}. ${chapter.name}`
          : `${formatNumber(chapter.chapter_number)}. ${chapter.name_translation}`;
      return `<option value="${chapter.chapter_number}">${escapeHtml(label)}</option>`;
    }),
  ];

  dom.verseChapterFilter.innerHTML = options.join("");
  dom.verseChapterFilter.value = previousSelection;
  state.selectedChapter = dom.verseChapterFilter.value || "all";
}

function buildTranslationMap(translations) {
  const grouped = new Map();

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

  const mapped = new Map();
  grouped.forEach((value, verseId) => {
    mapped.set(verseId, {
      english: chooseTranslation(value.englishOptions, "english"),
      hindi: chooseTranslation(value.hindiOptions, "hindi"),
    });
  });

  return mapped;
}

function chooseTranslation(options, language) {
  if (!options || !options.length) {
    return null;
  }
  const preferred = options.find((item) => item.author === PREFERRED_AUTHORS[language]);
  return preferred || options[0];
}

function getTranslation(verseId, language) {
  const row = state.translationMap.get(verseId);
  if (!row) {
    return null;
  }
  return row[language] || null;
}

function computeDailyQuoteVerseId() {
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

function applyUiLanguage() {
  document.documentElement.lang = state.uiLanguage === "hindi" ? "hi" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.setAttribute("placeholder", t(key));
  });

  syncControlStates();
}

function syncControlStates() {
  dom.langButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.uiLanguage);
  });
}

function runRevealForCurrentPanel() {
  const activePanel = dom.panels.find((panel) => panel.dataset.section === state.currentSection);
  if (!activePanel) {
    return;
  }
  const revealNodes = Array.from(activePanel.querySelectorAll(".reveal"));
  revealNodes.forEach((node, index) => {
    node.classList.remove("is-visible");
    node.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  });
  requestAnimationFrame(() => {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  });
}

function restorePreferences() {
  const savedLanguage = localStorage.getItem("gita-ui-language");

  if (savedLanguage && ["english", "hindi"].includes(savedLanguage)) {
    state.uiLanguage = savedLanguage;
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} (${response.status})`);
  }
  return await response.json();
}

function showFatalError(error) {
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

function hideLoading() {
  dom.loadingScreen.classList.add("hidden");
}

function t(key, vars = {}) {
  const source = UI_TEXT[state.uiLanguage] || UI_TEXT.english;
  const fallback = UI_TEXT.english;
  const template = source[key] ?? fallback[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, variable) => String(vars[variable] ?? ""));
}

function chapterTitle(chapter, language) {
  if (language === "hindi") {
    return chapter.name || chapter.name_translation || "";
  }
  return chapter.name_translation || chapter.name_transliterated || chapter.name || "";
}

function languageName(language) {
  if (language === "hindi") {
    return t("nameHindi");
  }
  return t("nameEnglish");
}

function getSecondaryLanguage(language) {
  return language === "english" ? "hindi" : "english";
}

function getLocale() {
  return state.uiLanguage === "hindi" ? "hi-IN" : "en-US";
}

function formatNumber(value) {
  return new Intl.NumberFormat(getLocale()).format(value);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
