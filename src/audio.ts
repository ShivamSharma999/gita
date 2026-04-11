import { ev } from "./dom";
import { state } from "./state";
import { VERSE_AUDIO_BASE_URL } from "./constants";

export const verseAudioPlayer = new Audio();
verseAudioPlayer.preload = "none";

export function configureVerseAudioPlayer() {
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

export async function toggleVerseAudio(button: HTMLElement) {
  const verseKey = button.dataset.audioKey;
  const audioUrl = button.dataset.audioUrl;
  if (!verseKey || !audioUrl) {
    return;
  }

  const isActiveVerse = state.activeAudioKey === verseKey;
  const isPlaying =
    state.audioStatus === "playing" || state.audioStatus === "loading";

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
      verseAudioPlayer.addEventListener("ended", resetAudioState);
      Object.assign(window, { vPlayer: verseAudioPlayer });
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

export function handleAudioPlayError(verseKey: string, error: unknown) {
  if (state.activeAudioKey !== verseKey) {
    return;
  }
  state.audioStatus = "error";
  state.audioErrorKey = verseKey;
  syncAudioButtons();
  console.error("Verse recitation playback failed:", error);
}

export function resetAudioState() {
  state.activeAudioKey = null;
  state.audioStatus = "idle";
  state.audioErrorKey = null;
  syncAudioButtons();
}

export function syncAudioButtons() {
  const audioButtons = Array.from(
    document.querySelectorAll("[data-audio-toggle]"),
  ) as HTMLButtonElement[];

  audioButtons.forEach((button) => {
    const verseKey = button.dataset.audioKey;
    if (!verseKey) {
      return;
    }

    const isActive = state.activeAudioKey === verseKey;
    const isLoading = isActive && state.audioStatus === "loading";

    button.textContent = getAudioButtonLabel(verseKey);
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute(
      "aria-pressed",
      String(isActive && (state.audioStatus === "playing" || isLoading)),
    );
  });
}

export function getAudioButtonLabel(verseKey: string) {
  if (state.audioErrorKey === verseKey) {
    return "sync_problem";
  }
  if (state.activeAudioKey !== verseKey) {
    return "volume_up";
  }
  if (state.audioStatus === "loading") {
    return "donut_large";
  }
  if (state.audioStatus === "playing") {
    return "pause";
  }
  return "play_arrow";
}

export function getVerseAudioKey(verse: any) {
  return `${verse.chapter_number}:${verse.verse_number}`;
}

export function buildVerseAudioUrl(verse: any) {
  return `${VERSE_AUDIO_BASE_URL}/${verse.chapter_number}/${verse.verse_number}.mp3`;
}
