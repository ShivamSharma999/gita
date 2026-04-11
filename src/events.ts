import { dom, ev } from "./dom";
import { state, t } from "./state";
import { renderAll, renderChapters, renderVerses, populateChapterFilter, runRevealForCurrentPanel, getFilteredVerses } from "./render";
import { toggleVerseAudio } from "./audio";

export function setLanguage(language: string) {
  if (language !== "english" && language !== "hindi") {
    return;
  }

  state.uiLanguage = language as any;
  localStorage.setItem("gita-ui-language", language);
  applyUiLanguage();
  populateChapterFilter();
  renderAll();
}

export function showSection(sectionName: string) {
  if (!sectionName) {
    return;
  }
  const previousSection = state.currentSection;
  state.currentSection = sectionName;

  if (previousSection !== sectionName && state.activeAudioKey) {
    // This is safe because audio player and resetAudioState live in audio module
    import("./audio").then(({ verseAudioPlayer, resetAudioState }) => {
      verseAudioPlayer.pause();
      resetAudioState();
    });
  }

  dom.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.sectionTarget === sectionName);
  });

  dom.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.section === sectionName);
  });

  runRevealForCurrentPanel();
}

export function applyUiLanguage() {
  document.documentElement.lang = state.uiLanguage === "hindi" ? "hi" : "en";

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key || "");
  });

  document.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.setAttribute("placeholder", t(key || ""));
  });

  syncControlStates();
}

export function syncControlStates() {
  dom.langButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.uiLanguage);
  });
}

export function bindEvents() {
  dom.navItems.forEach((item) => {
    ev(item, "click", () => {
      const section = item.dataset.sectionTarget;
      if (section) {
        showSection(section);
      }
    });
  });

  dom.langButtons.forEach((button) => {
    ev(button, "click", () => setLanguage(button.dataset.lang || "english"));
  });

  ev(dom.chapterSearchInput, "input", () => {
    state.chapterSearch = dom.chapterSearchInput.value.trim();
    renderChapters();
  });

  ev(dom.chaptersGrid, "click", (event: Event) => {
    const target = (event.target as HTMLElement) || null;
    const chapterButton = target?.closest("[data-open-chapter]") as HTMLElement | null;
    if (!chapterButton) {
      return;
    }
    const chapterNumber = chapterButton.dataset.openChapter || "all";
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

  ev(document, "click", async (event: Event) => {
    const target = (event.target as HTMLElement) || null;
    const actionButton = target?.closest("[data-action]") as HTMLElement | null;

    if (actionButton) {
      const action = actionButton.dataset.action;
      const verseId = Number(actionButton.dataset.verseId);
      const verse = state.verseById.get(verseId);
      if (!verse) {
        return;
      }

      try {
        if (action === "copy") {
          await import("./render").then(({ copyVerseToClipboard }) => copyVerseToClipboard(verse));
          alert("Copied to clipboard");
        } else if (action === "download") {
          await import("./render").then(({ saveVerseAsImage }) => saveVerseAsImage(verse));
        } else if (action === "share") {
          await import("./render").then(({ shareVerseAsImage }) => shareVerseAsImage(verse));
        }
      } catch (error) {
        console.error(error);
        alert("Action failed. Please try again.");
      }
      return;
    }

    const audioButton = target?.closest("[data-audio-toggle]") as HTMLElement | null;
    if (audioButton) {
      toggleVerseAudio(audioButton);
    }
  });

  ev(window, "keypress", (e: Event) => {
    const keyboard = e as KeyboardEvent;
    if (keyboard.shiftKey && keyboard.ctrlKey && keyboard.key.toLowerCase() === "i") {
      keyboard.preventDefault();
      return;
    }
    if (keyboard.key.toLowerCase() === "r" && keyboard.ctrlKey) {
      keyboard.preventDefault();
      return;
    }
  });

  ev(window, "contextmenu", (e: Event) => e.preventDefault());
}
