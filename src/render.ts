import { dom } from "./dom";
import { state, t, escapeHtml, cleanText, truncate, formatNumber, chapterTitle, getTranslation, getSecondaryLanguage, languageName } from "./state";
import { getVerseAudioKey, buildVerseAudioUrl, syncAudioButtons, verseAudioPlayer, resetAudioState } from "./audio";

export function runRevealForCurrentPanel() {
  const activePanel = dom.panels.find((panel) => panel.dataset.section === state.currentSection);
  if (!activePanel) {
    return;
  }
  const revealNodes = Array.from(activePanel.querySelectorAll<HTMLElement>(".reveal"));
  revealNodes.forEach((node, index) => {
    node.classList.remove("is-visible");
    node.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  });
  requestAnimationFrame(() => {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  });
}

export function renderAll() {
  renderHomeSpotlight();
  renderChapters();
  renderVerses();
  syncAudioButtons();
}

export function renderHomeSpotlight() {
  const dailyVerse = state.dailyQuoteVerseId !== null ? state.verseById.get(state.dailyQuoteVerseId) : undefined;
  if (!dailyVerse) {
    dom.homeSpotlight.innerHTML = "";
    return;
  }

  const chapter = state.chapterByNumber.get(dailyVerse.chapter_number);
  const verseTxt = dailyVerse.text;
  const summary = getTranslation(dailyVerse.id, state.uiLanguage);

  dom.homeSpotlight.innerHTML = `
    <p class="verse-tag">${escapeHtml(t("homeSpotlightTitle"))}</p>
    <h3 class="verse-title">${escapeHtml(chapter ? chapterTitle(chapter, state.uiLanguage) : "")} • ${dailyVerse.verse_number}</h3>
    <p class="chapter-summary ${state.uiLanguage === "hindi" ? "dev-font" : ""}">
      ${escapeHtml(verseTxt)}<br>${escapeHtml(summary?.text || "")}
    </p>
  `;
}

export function renderChapters() {
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
      const summary = state.uiLanguage === "hindi" ? chapter.chapter_summary_hindi || chapter.chapter_summary : chapter.chapter_summary;
      return `
        <article class="chapter-card reveal">
          <div class="chapter-top">
            <p class="chapter-number">${escapeHtml(t("chapterOnlyTag", { chapter: formatNumber(chapter.chapter_number) }))}</p>
            <p class="chapter-verse-count">${escapeHtml(t("chapterVerseCount", { count: formatNumber(chapter.verses_count) }))}</p>
          </div>
          <h3 class="chapter-name">${escapeHtml(chapterTitle(chapter, "english"))}</h3>
          <p class="chapter-devanagari dev-font">${escapeHtml(chapter.name)}</p>
          <p class="chapter-summary ${state.uiLanguage === "hindi" ? "dev-font" : ""}">${escapeHtml(summary)}</p>
          <button class="btn btn-ghost" data-open-chapter="${chapter.chapter_number}">
            ${escapeHtml(t("chapterJump"))}
          </button>
        </article>
      `;
    })
    .join("");
  runRevealForCurrentPanel();
}

export function renderVerses() {
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

function buildVerseHeaderMarkup(verse: any) {
  const chapter = state.chapterByNumber.get(verse.chapter_number);
  const verseKey = getVerseAudioKey(verse);
  const verseAudioUrl = buildVerseAudioUrl(verse);

  return `
    <header class="verse-head">
      <div>
        <p class="verse-tag">${escapeHtml(t("chapterTag", { chapter: formatNumber(verse.chapter_number), verse: formatNumber(verse.verse_number) }))}</p>
        <h3 class="verse-title">${escapeHtml(chapter ? chapterTitle(chapter, state.uiLanguage) : "")}</h3>
      </div>
      <div class="verse-actions" aria-label="Verse actions">
        <button class="material-symbols-rounded btn btn-ghost verse-action-btn verse-audio-action" type="button" data-audio-toggle data-audio-key="${escapeHtml(verseKey)}" data-audio-url="${escapeHtml(verseAudioUrl)}">
          volume_up
        </button>
        <button class="btn btn-ghost verse-action-btn" type="button" data-action="copy" data-verse-id="${escapeHtml(String(verse.id))}" title="${escapeHtml(t("copyVerse")) || "Copy verse"}">
          <span class="material-symbols-rounded">content_copy</span>
        </button>
        <button class="btn btn-ghost verse-action-btn" type="button" data-action="download" data-verse-id="${escapeHtml(String(verse.id))}" title="${escapeHtml(t("downloadVerseImage")) || "Save verse as image"}">
          <span class="material-symbols-rounded">download</span>
        </button>
        <button class="btn btn-ghost verse-action-btn" type="button" data-action="share" data-verse-id="${escapeHtml(String(verse.id))}" title="${escapeHtml(t("shareVerseImage")) || "Share verse image"}">
          <span class="material-symbols-rounded">share</span>
        </button>
      </div>
    </header>
  `;
}

function buildVerseBodyMarkup(verse: any) {
  const primaryLang = state.uiLanguage;
  const primaryTranslation = getTranslation(verse.id, primaryLang);

  return `
    <div class="sanskrit-box">
      <p class="dev-font">${escapeHtml(cleanText(verse.text))}</p>
    </div>
    <div class="translation-grid">
      ${translationBlockMarkup(primaryLang, primaryTranslation, true)}
    </div>
  `;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

async function buildVerseImageCanvas(verse: any): Promise<HTMLCanvasElement> {
  const translation = getTranslation(verse.id, state.uiLanguage);
  const verseLabel = `${t("chapterTag", { chapter: formatNumber(verse.chapter_number), verse: formatNumber(verse.verse_number) })}`;
  const verseText = cleanText(verse.text);
  const meaningText = translation?.text || t("translationMissing");
  const authorText = translation?.author ? `\n\n${t("translatorLabel")}: ${translation.author}` : "";

  const width = 1080;
  const margin = 38;
  const innerWidth = width - margin * 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const headingFont = "700 28px Cinzel, serif";
  const sanskritFont = "600 32px 'Noto Sans Devanagari', sans-serif";
  const bodyFont = "400 21px 'Plus Jakarta Sans', sans-serif";

  ctx.font = headingFont;
  const headerLines = wrapText(ctx, verseLabel, innerWidth);

  ctx.font = sanskritFont;
  const sanskritLines = wrapText(ctx, verseText, innerWidth);

  ctx.font = bodyFont;
  const meaningLines = wrapText(ctx, meaningText, innerWidth);
  const authorLines = authorText ? wrapText(ctx, authorText.trim(), innerWidth) : [];

  const lineHeightHeader = 36;
  const lineHeightSanskrit = 42;
  const lineHeightBody = 28;

  const contentHeight =
    lineHeightHeader * headerLines.length +
    lineHeightSanskrit * sanskritLines.length +
    lineHeightBody * meaningLines.length +
    lineHeightBody * authorLines.length +
    24 +
    35;

  const height = margin * 2 + contentHeight;
  canvas.width = width;
  canvas.height = height;

  const sx = 0;
  const sy = 0;
  ctx.fillStyle = "#fffdf3";
  ctx.fillRect(sx, sy, width, height);
  ctx.strokeStyle = "#d7c48f";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 2, sy + 2, width - 4, height - 4);

  let y = margin + 28;

  ctx.textBaseline = "top";
  ctx.fillStyle = "#1f3247";

  ctx.font = headingFont;
  headerLines.forEach((line) => {
    ctx.fillText(line, margin, y);
    y += lineHeightHeader;
  });

  y += 14;

  ctx.font = sanskritFont;
  ctx.fillStyle = "#1a2a3c";
  sanskritLines.forEach((line) => {
    ctx.fillText(line, margin, y);
    y += lineHeightSanskrit;
  });

  y += 14;

  ctx.font = bodyFont;
  ctx.fillStyle = "#283847";
  meaningLines.forEach((line) => {
    ctx.fillText(line, margin, y);
    y += lineHeightBody;
  });

  if (authorLines.length) {
    y += 8;
    ctx.fillStyle = "#50617d";
    authorLines.forEach((line) => {
      ctx.fillText(line, margin, y);
      y += lineHeightBody;
    });
  }

  return canvas;
}

export async function generateVerseImageBlob(verse: any): Promise<Blob> {
  const canvas = await buildVerseImageCanvas(verse);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to render image"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function copyVerseToClipboard(verse: any) {
  const translation = getTranslation(verse.id, state.uiLanguage);
  const url = `${t("chapterTag", { chapter: formatNumber(verse.chapter_number), verse: formatNumber(verse.verse_number) })}`;
  const text = `${url}\n\n${cleanText(verse.text)}\n\n${translation?.text || t("translationMissing")}`;
  await navigator.clipboard.writeText(text);
  return true;
}

export async function saveVerseAsImage(verse: any) {
  const blob = await generateVerseImageBlob(verse);
  const fileName = `gita-${verse.chapter_number}-${verse.verse_number}.png`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareVerseAsImage(verse: any) {
  const blob = await generateVerseImageBlob(verse);
  const file = new File([blob], `gita-${verse.chapter_number}-${verse.verse_number}.png`, { type: "image/png" });
  const shareData: any = {
    title: `Gita ${verse.chapter_number}:${verse.verse_number}`,
    text: `${t("chapterTag", { chapter: formatNumber(verse.chapter_number), verse: formatNumber(verse.verse_number) })}`,
  };

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    shareData.files = [file];
    await navigator.share(shareData);
    return;
  }

  await saveVerseAsImage(verse); // fallback
  return;
}

export function getFilteredVerses() {
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

export function populateChapterFilter() {
  if (!state.chapters.length) {
    dom.verseChapterFilter.innerHTML = `<option value="all">${escapeHtml(t("allChapters"))}</option>`;
    return;
  }

  const previousSelection = state.selectedChapter;
  const options = [
    `<option value="all">${escapeHtml(t("allChapters"))}</option>`,
    ...state.chapters.map((chapter) => {
      const label = state.uiLanguage === "hindi" ? `${formatNumber(chapter.chapter_number)}. ${chapter.name}` : `${formatNumber(chapter.chapter_number)}. ${chapter.name_translation}`;
      return `<option value="${chapter.chapter_number}">${escapeHtml(label)}</option>`;
    }),
  ];

  dom.verseChapterFilter.innerHTML = options.join("");
  dom.verseChapterFilter.value = previousSelection;
  state.selectedChapter = dom.verseChapterFilter.value || "all";
}

function translationBlockMarkup(language: string, entry: any, primary: boolean) {
  const translationText = entry?.text || t("translationMissing");
  const author = entry?.author || t("unknownAuthor");

  return `
    <div class="translation-block">
      <h4>${escapeHtml(primary ? t("translationPrimary") : t("translationSecondary"))} • ${escapeHtml(languageName(language as any))}</h4>
      <p class="${language === "hindi" ? "dev-font" : ""}">${escapeHtml(translationText)}</p>
      <p class="translator">${escapeHtml(`${t("translatorLabel")}: ${author}`)}</p>
    </div>
  `;
}
