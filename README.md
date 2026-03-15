# Bhagavat Gita
![](./src/assets/main-2.webp)
A modern, responsive Bhagavad Gita viewer with chapter/verse exploration, Hindi/English UI, audio recitation, translation support, and verse sharing.

Built as a web-first experience with a Tauri desktop wrapper for packaged apps.

##  Features

- 18 chapters and 700+ verses of the Bhagavad Gita
- Dual-language UI: English and हद
- Chapter list with search and chapter summary
- Verse browser with:
  - chapter filter
  - full-text search (Sanskrit, transliteration, meaning, translations)
  - pagination
- Daily spotlight verse
- Verse actions:
  - play/pause recitation audio
  - copy verse text to clipboard
  - save verse as a PNG image
  - share verse image using Web Share API (when supported)
- Offline-friendly static data bundle (`src/assets/data`) + online audio URL support
- Small, fast vanilla TypeScript frontend (no framework)

##  Project structure

- `src/` - source code
  - `app.ts` - bootstrap and initial data load
  - `state.ts` - app state, translation map, helpers
  - `events.ts` - event binding, navigation, language controls
  - `render.ts` - rendering for home/chapter/verse views, canvas image generation
  - `audio.ts` - audio playback handling and state syncing
  - `dom.ts`, `types.ts`, `constants.ts` - DOM helpers, type definitions, config
  - `index.html` - app shell and markup
  - `styles.css` - visual theme
- `src/assets/data/` - content JSON files
  - `chapters.json`, `verse.json`, `translation.json`, `languages.json`, `ui_translation.json`
- `src-tauri/` - Tauri desktop app configuration

##  Setup

### Prerequisites

- Node.js 18+ (recommended)
- npm
- Rust + Cargo (for Tauri desktop builds)
- `npm install -g @tauri-apps/cli` (optional if not globally installed)

### Install dependencies

```bash
npm install
```

### Development build (web)

```bash
npm run build
```

This runs:
- `npm run build:ts` (TypeScript compile)
- `npm run patch:imports` (fix generated JS imports)
- `npm run build:static` (copy assets to output)

### Run in Tauri (desktop dev)

```bash
npm run tauri dev
```

### Build a release bundle (desktop)

```bash
npm run tauri build
```

##  Data sources

- Scripture verses: `src/assets/data/verse.json`
- Chapter metadata: `src/assets/data/chapters.json`
- Translations: `src/assets/data/translation.json` (`english`/`hindi` entries)
- UI localization: `src/assets/data/ui_translation.json`
- Audio: `https://raw.githubusercontent.com/gita/gita/main/data/verse_recitation/{chapter}/{verse}.mp3`

##  Extending and customization

- Add new language strings under `ui_translation.json` and use keys in HTML via `data-i18n` / `data-i18n-placeholder`.
- Add translation alternatives to `translation.json`; the app chooses preferred authors using `PREFERRED_AUTHORS` in `src/constants.ts`.
- Customize styling in `src/styles.css`.

##  Testing

No explicit test suite included yet. Manual verification is via UI actions in browser or Tauri app.

##  Notes

- The app persists selected language in `localStorage` using key `gita-ui-language`.
- Verse copy is done with `navigator.clipboard.writeText`.
- If sharing isnt supported, the fallback downloads an image.

##  License

Add a license your project requires (for example, MIT).

## Powered by Sanatan AI
![](./src/assets/favicon.ico)