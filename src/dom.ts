import { DomRefs } from "./types";

export const dom: DomRefs = {
  loadingScreen: document.getElementById("loadingScreen")!,
  navItems: Array.from(document.querySelectorAll(".nav-item")) as HTMLElement[],
  panels: Array.from(document.querySelectorAll(".panel")) as HTMLElement[],
  langButtons: Array.from(document.querySelectorAll(".lang-btn")) as HTMLElement[],
  homeSpotlight: document.getElementById("homeSpotlight")!,
  chapterSearchInput: document.getElementById("chapterSearchInput") as HTMLInputElement,
  chaptersGrid: document.getElementById("chaptersGrid")!,
  verseChapterFilter: document.getElementById("verseChapterFilter") as HTMLSelectElement,
  verseSearchInput: document.getElementById("verseSearchInput") as HTMLInputElement,
  versePageSize: document.getElementById("versePageSize") as HTMLSelectElement,
  verseResultMeta: document.getElementById("verseResultMeta")!,
  versesList: document.getElementById("versesList")!,
  prevPageBtn: document.getElementById("prevPageBtn") as HTMLButtonElement,
  nextPageBtn: document.getElementById("nextPageBtn") as HTMLButtonElement,
  pageInfo: document.getElementById("pageInfo")!,
};

export function ev(to: HTMLElement | Document | Window, events: string, listener: EventListenerOrEventListenerObject) {
  const eventList = events.split(",");
  eventList.forEach((e) => {
    (to as HTMLElement | Document | Window).addEventListener(e, listener as EventListener);
  });
}
